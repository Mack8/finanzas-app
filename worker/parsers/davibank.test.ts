// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseDavibank } from './davibank'

const fixture = readFileSync(join(__dirname, '__fixtures__', 'davibank-compra.txt'), 'utf8')

describe('parseDavibank', () => {
  it('extrae todos los campos de la frase de aprobación', () => {
    expect(parseDavibank(fixture)).toEqual({
      ok: true,
      purchase: {
        bank: 'davibank',
        merchant: 'ALM EL REY 8 ALAJUELA ALAJUELA',
        merchantCategoryHint: null,
        occurredAt: '2026-09-25T14:31:00-06:00',
        cardLast4: '7002',
        authorization: '100002',
        reference: '900000000002',
        amount: 4580,
        currency: 'CRC',
      },
    })
  })

  it('tolera saltos de línea dentro de la frase', () => {
    const wrapped = fixture.replace('el día 25/09/2026', 'el día\r\n25/09/2026').replace('con su tarjeta', 'con su\ntarjeta')
    expect(parseDavibank(wrapped).ok).toBe(true)
  })

  it('convierte 12:xx AM a 00:xx sin cambiar el día', () => {
    const r = parseDavibank(fixture.replace('02:31 PM', '12:05 AM'))
    expect(r).toMatchObject({ ok: true, purchase: { occurredAt: '2026-09-25T00:05:00-06:00' } })
  })

  it('mantiene 12:xx PM como mediodía', () => {
    const r = parseDavibank(fixture.replace('02:31 PM', '12:30 PM'))
    expect(r).toMatchObject({ ok: true, purchase: { occurredAt: '2026-09-25T12:30:00-06:00' } })
  })

  it('lee compras en USD', () => {
    const r = parseDavibank(fixture.replace('CRC 4,580.00', 'USD 25.99'))
    expect(r).toMatchObject({ ok: true, purchase: { amount: 25.99, currency: 'USD' } })
  })

  it('no crea gasto si la transacción fue rechazada', () => {
    const r = parseDavibank(fixture.replace('fue aprobada', 'fue rechazada'))
    expect(r).toEqual({ ok: false, reason: 'DAVIbank: la transacción no fue aprobada (rechazada)' })
  })

  it('falla si la frase no coincide con la plantilla', () => {
    expect(parseDavibank('Estimado cliente, su estado de cuenta está disponible.').ok).toBe(false)
  })

  it('falla con un monto de formato ambiguo', () => {
    const r = parseDavibank(fixture.replace('CRC 4,580.00', 'CRC 4.580,00'))
    expect(r.ok).toBe(false)
  })
})
