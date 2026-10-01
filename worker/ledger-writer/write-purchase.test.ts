// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import type { ParsedPurchase } from '../types'
import type { InsertResult, LedgerStore, NewLedgerRow } from './store'
import { writePurchase } from './write-purchase'

const purchase: ParsedPurchase = {
  bank: 'bac', merchant: 'DLC* DIDI FOODS', merchantCategoryHint: null,
  occurredAt: '2026-09-29T19:47:00-06:00', cardLast4: '7001',
  authorization: '100001', reference: '900000000001', amount: 3730, currency: 'CRC',
}

function memoryStore(accountId: string | null = 'acc-1') {
  const rows: NewLedgerRow[] = []
  const refs = new Set<string>()
  const store: LedgerStore = {
    findPaymentAccountId: vi.fn(async () => accountId),
    insertTransaction: vi.fn(async (row: NewLedgerRow): Promise<InsertResult> => {
      if (row.external_ref && refs.has(row.external_ref)) return { status: 'duplicate' }
      if (row.external_ref) refs.add(row.external_ref)
      rows.push(row)
      return { status: 'inserted', id: `tx-${rows.length}` }
    }),
  }
  return { store, rows }
}

const noRate = async () => null

describe('writePurchase', () => {
  it('inserta una compra en CRC con todos los campos del ledger', async () => {
    const { store, rows } = memoryStore()
    const r = await writePurchase(purchase, 'cat-1', { userId: 'u1', store, getRate: noRate })
    expect(r).toEqual({ status: 'created', transactionId: 'tx-1', accountFound: true })
    expect(rows[0]).toEqual({
      user_id: 'u1', date: '2026-09-29', description: 'DLC* DIDI FOODS',
      amount: 3730, currency: 'CRC', amount_crc: 3730, exchange_rate_id: null,
      category_id: 'cat-1', payment_account_id: 'acc-1', transaction_type: 'personal',
      tags: ['email'], notes: null, source: 'email', external_ref: 'bac:100001:900000000001',
    })
  })

  it('no cambia el día de una compra cerca de la medianoche', async () => {
    const { store, rows } = memoryStore()
    await writePurchase({ ...purchase, occurredAt: '2026-09-29T23:58:00-06:00' }, 'cat-1', { userId: 'u1', store, getRate: noRate })
    expect(rows[0].date).toBe('2026-09-29')
  })

  it('convierte USD con la tasa de la fecha de la operación', async () => {
    const { store, rows } = memoryStore()
    const getRate = vi.fn(async (_date: string) => ({ id: 'rate-1', date: '2026-09-29', usd_to_crc: 510 }))
    await writePurchase({ ...purchase, currency: 'USD', amount: 10 }, 'cat-1', { userId: 'u1', store, getRate })
    expect(getRate).toHaveBeenCalledWith('2026-09-29')
    expect(rows[0]).toMatchObject({ currency: 'USD', amount: 10, amount_crc: 5100, exchange_rate_id: 'rate-1' })
  })

  it('pide reintento y no inserta si falta la tasa BCCR', async () => {
    const { store, rows } = memoryStore()
    const r = await writePurchase({ ...purchase, currency: 'USD', amount: 10 }, 'cat-1', { userId: 'u1', store, getRate: noRate })
    expect(r).toEqual({ status: 'retry', reason: 'Sin tipo de cambio BCCR para 2026-09-29' })
    expect(rows).toHaveLength(0)
  })

  it('crea la transacción sin cuenta y lo anota cuando la tarjeta no está registrada', async () => {
    const { store, rows } = memoryStore(null)
    const r = await writePurchase(purchase, 'cat-1', { userId: 'u1', store, getRate: noRate })
    expect(r).toMatchObject({ status: 'created', accountFound: false })
    expect(rows[0]).toMatchObject({ payment_account_id: null, notes: 'Cuenta no encontrada: bac ****7001' })
  })

  it('el mismo correo dos veces produce una sola transacción', async () => {
    const { store, rows } = memoryStore()
    const deps = { userId: 'u1', store, getRate: noRate }
    await writePurchase(purchase, 'cat-1', deps)
    expect(await writePurchase(purchase, 'cat-1', deps)).toEqual({ status: 'duplicate' })
    expect(rows).toHaveLength(1)
  })

  it('dos compras con la misma autorización y distinta referencia no se pisan', async () => {
    const { store, rows } = memoryStore()
    const deps = { userId: 'u1', store, getRate: noRate }
    await writePurchase(purchase, 'cat-1', deps)
    const r = await writePurchase({ ...purchase, reference: '999999999999' }, 'cat-1', deps)
    expect(r.status).toBe('created')
    expect(rows).toHaveLength(2)
  })

  it('la misma autorización y referencia en otro banco es otra compra', async () => {
    const { store, rows } = memoryStore()
    const deps = { userId: 'u1', store, getRate: noRate }
    await writePurchase(purchase, 'cat-1', deps)
    const r = await writePurchase({ ...purchase, bank: 'promerica' }, 'cat-1', deps)
    expect(r.status).toBe('created')
    expect(rows).toHaveLength(2)
  })
})
