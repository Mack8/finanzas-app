// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseBac } from './bac'

const fixture = readFileSync(join(__dirname, '__fixtures__', 'bac-compra.txt'), 'utf8')

describe('parseBac', () => {
  it('extrae todos los campos de una compra', () => {
    expect(parseBac(fixture)).toEqual({
      ok: true,
      purchase: {
        bank: 'bac',
        merchant: 'DLC* DIDI FOODS',
        merchantCategoryHint: null,
        occurredAt: '2026-09-29T19:47:00-06:00',
        cardLast4: '7001',
        authorization: '100001',
        reference: '900000000001',
        amount: 3730,
        currency: 'CRC',
      },
    })
  })

  it('funciona con saltos de línea CRLF', () => {
    const r = parseBac(fixture.replace(/\n/g, '\r\n'))
    expect(r.ok).toBe(true)
  })

  it('lee montos en USD con miles', () => {
    const r = parseBac(fixture.replace('CRC 3,730.00', 'USD 1,250.50'))
    expect(r).toMatchObject({ ok: true, purchase: { amount: 1250.5, currency: 'USD' } })
  })

  it('no trata como compra un tipo de transacción distinto de COMPRA', () => {
    const r = parseBac(fixture.replace('COMPRA', 'REVERSION'))
    expect(r).toEqual({ ok: false, reason: 'BAC: tipo de transacción no soportado (REVERSION)' })
  })

  it('falla si falta el monto', () => {
    const r = parseBac(fixture.replace(/^Monto:.*$/m, ''))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toContain('monto')
  })

  it('falla si el monto tiene un formato ambiguo', () => {
    const r = parseBac(fixture.replace('CRC 3,730.00', 'CRC 3.730,00'))
    expect(r).toEqual({ ok: false, reason: 'BAC: monto no reconocido (CRC 3.730,00)' })
  })

  it('falla si la fecha no se reconoce', () => {
    const r = parseBac(fixture.replace('Sep 29, 2026, 19:47', '29/09/2026'))
    expect(r.ok).toBe(false)
  })

  it('falla con un correo que no es una alerta', () => {
    expect(parseBac('Hola, promoción de verano').ok).toBe(false)
  })
})
