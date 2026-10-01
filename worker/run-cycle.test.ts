// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import type { BankMessage } from './graph/mail'
import { runCycle, type CycleDeps } from './run-cycle'
import { memoryCursorStore } from './state/cursor'
import { memoryIngestLog } from './state/ingest-log'

const BAC_BODY = readFileSync(join(__dirname, 'parsers', '__fixtures__', 'bac-compra.txt'), 'utf8')

const msg = (id: string, receivedAt: string, over: Partial<BankMessage> = {}): BankMessage => ({
  id, bank: 'bac', receivedAt, from: 'alertas@bac.example', subject: 'Notificación',
  bodyText: BAC_BODY, authPass: true, ...over,
})

function setup(messages: BankMessage[], over: Partial<CycleDeps> = {}) {
  const cursor = memoryCursorStore()
  const log = memoryIngestLog()
  const write = vi.fn<CycleDeps['write']>(async () => ({ status: 'created', transactionId: 'tx-1', accountFound: true }))
  const deps: CycleDeps = {
    now: () => new Date('2026-09-30T12:00:00Z'),
    cursor, log,
    fetchMessages: vi.fn(async (_since: string) => messages),
    categorize: vi.fn(async () => ({ categoryId: 'cat-1', source: 'model' as const, categoryName: 'Alimentación' })),
    write,
    requireAuthPass: false,
    initialLookbackDays: 3,
    report: () => {},
    ...over,
  }
  return { deps, cursor, log, write }
}

describe('runCycle', () => {
  it('crea la transacción, registra el correo y avanza el cursor', async () => {
    const { deps, cursor, log, write } = setup([msg('m1', '2026-09-29T19:48:10Z')])
    const summary = await runCycle(deps)
    expect(summary).toMatchObject({ created: 1 })
    expect(write).toHaveBeenCalledWith(expect.objectContaining({ merchant: 'DLC* DIDI FOODS' }), 'cat-1')
    expect(log.entries).toEqual([{ messageId: 'm1', bank: 'bac', status: 'created', subject: 'Notificación', transactionId: 'tx-1' }])
    expect(cursor.value).toBe('2026-09-29T19:48:10Z')
  })

  it('sin cursor, lee desde ahora menos la ventana inicial', async () => {
    const { deps } = setup([])
    await runCycle(deps)
    expect(deps.fetchMessages).toHaveBeenCalledWith('2026-09-27T12:00:00.000Z')
  })

  it('con cursor, lee desde el cursor', async () => {
    const { deps, cursor } = setup([])
    await cursor.write('2026-09-29T10:00:00Z')
    await runCycle(deps)
    expect(deps.fetchMessages).toHaveBeenCalledWith('2026-09-29T10:00:00Z')
  })

  it('un correo que no se puede leer queda como unparsed y no se descarta en silencio', async () => {
    const { deps, cursor, log, write } = setup([msg('m1', '2026-09-29T19:48:10Z', { bodyText: 'Hola, promoción' })])
    const summary = await runCycle(deps)
    expect(summary).toMatchObject({ unparsed: 1, created: 0 })
    expect(write).not.toHaveBeenCalled()
    expect(log.entries[0]).toMatchObject({ messageId: 'm1', status: 'unparsed', bank: 'bac' })
    expect(log.entries[0].detail).toContain('BAC')
    expect(cursor.value).toBe('2026-09-29T19:48:10Z')
  })

  it('una reversión de un remitente permitido no crea gasto', async () => {
    const reversal = BAC_BODY.replace('COMPRA', 'REVERSION')
    const { deps, write, log } = setup([msg('m1', '2026-09-29T19:48:10Z', { bodyText: reversal })])
    await runCycle(deps)
    expect(write).not.toHaveBeenCalled()
    expect(log.entries[0].status).toBe('unparsed')
  })

  it('registra duplicados y avanza el cursor', async () => {
    const { deps, cursor, log } = setup([msg('m1', '2026-09-29T19:48:10Z')], {
      write: async () => ({ status: 'duplicate' as const }),
    })
    expect(await runCycle(deps)).toMatchObject({ duplicate: 1 })
    expect(log.entries[0].status).toBe('duplicate')
    expect(cursor.value).toBe('2026-09-29T19:48:10Z')
  })

  it('omite los correos ya resueltos sin volver a escribir', async () => {
    const { deps, log, write } = setup([msg('m1', '2026-09-29T19:48:10Z')])
    await log.record({ messageId: 'm1', bank: 'bac', status: 'created' })
    expect(await runCycle(deps)).toMatchObject({ skipped: 1, created: 0 })
    expect(write).not.toHaveBeenCalled()
  })

  it('reintenta los correos con error registrado', async () => {
    const { deps, log, write } = setup([msg('m1', '2026-09-29T19:48:10Z')])
    await log.record({ messageId: 'm1', bank: 'bac', status: 'error', detail: 'Supabase caído' })
    await runCycle(deps)
    expect(write).toHaveBeenCalledTimes(1)
  })

  it('un reintento (sin tasa BCCR) no se pierde ni bloquea a los demás, y el cursor no lo salta', async () => {
    const write = vi.fn()
      .mockResolvedValueOnce({ status: 'retry' as const, reason: 'Sin tipo de cambio BCCR para 2026-09-29' })
      .mockResolvedValueOnce({ status: 'created' as const, transactionId: 'tx-2', accountFound: true })
    const { deps, cursor, log } = setup(
      [msg('m1', '2026-09-29T19:00:00Z'), msg('m2', '2026-09-29T20:00:00Z')],
      { write },
    )
    await cursor.write('2026-09-29T00:00:00Z')
    const summary = await runCycle(deps)
    expect(summary).toMatchObject({ retry: 1, created: 1 })
    expect(log.entries.map(e => e.messageId)).toEqual(['m2'])
    expect(cursor.value).toBe('2026-09-29T00:00:00Z')
  })

  it('una excepción se registra como error, no detiene el lote y bloquea el cursor', async () => {
    const write = vi.fn()
      .mockRejectedValueOnce(new Error('Supabase caído'))
      .mockResolvedValueOnce({ status: 'created' as const, transactionId: 'tx-2', accountFound: true })
    const { deps, cursor, log } = setup(
      [msg('m1', '2026-09-29T19:00:00Z'), msg('m2', '2026-09-29T20:00:00Z')],
      { write },
    )
    const summary = await runCycle(deps)
    expect(summary).toMatchObject({ error: 1, created: 1 })
    expect(log.entries.find(e => e.messageId === 'm1')).toMatchObject({ status: 'error', detail: 'Supabase caído' })
    expect(cursor.value).toBeNull()
  })

  it('un mismo lote con dos compras crea dos transacciones y avanza hasta la última', async () => {
    const { deps, cursor, write } = setup([msg('m1', '2026-09-29T19:00:00Z'), msg('m2', '2026-09-29T20:00:00Z')])
    expect(await runCycle(deps)).toMatchObject({ created: 2 })
    expect(write).toHaveBeenCalledTimes(2)
    expect(cursor.value).toBe('2026-09-29T20:00:00Z')
  })

  it('con requireAuthPass, un remitente sin DMARC válido no crea gasto', async () => {
    const { deps, write, log } = setup(
      [msg('m1', '2026-09-29T19:00:00Z', { authPass: false }), msg('m2', '2026-09-29T20:00:00Z', { authPass: null })],
      { requireAuthPass: true },
    )
    const summary = await runCycle(deps)
    expect(summary).toMatchObject({ unparsed: 2, created: 0 })
    expect(write).not.toHaveBeenCalled()
    expect(log.entries[0].detail).toContain('autenticación')
  })

  it('sin correos nuevos no toca el cursor', async () => {
    const { deps, cursor } = setup([])
    await runCycle(deps)
    expect(cursor.value).toBeNull()
  })

  it('informa cada resultado', async () => {
    const report = vi.fn()
    const { deps } = setup([msg('m1', '2026-09-29T19:48:10Z')], { report })
    await runCycle(deps)
    expect(report).toHaveBeenCalledWith(expect.stringContaining('DLC* DIDI FOODS'))
  })
})
