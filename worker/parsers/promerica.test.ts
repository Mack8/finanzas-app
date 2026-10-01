// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parsePromerica } from './promerica'

const fixture = readFileSync(join(__dirname, '__fixtures__', 'promerica-compra.txt'), 'utf8')

describe('parsePromerica', () => {
  it('extrae todos los campos, incluido el tipo de comercio', () => {
    expect(parsePromerica(fixture)).toEqual({
      ok: true,
      purchase: {
        bank: 'promerica',
        merchant: 'TACO BELL CITY MALL ALAJUELA CRI',
        merchantCategoryHint: 'RESTAURANTS',
        occurredAt: '2026-09-29T13:05:00-06:00',
        cardLast4: '7003',
        authorization: '100003',
        reference: '9000000003',
        amount: 2500,
        currency: 'CRC',
      },
    })
  })

  it('funciona con saltos de línea CRLF', () => {
    expect(parsePromerica(fixture.replace(/\n/g, '\r\n')).ok).toBe(true)
  })

  it('lee el monto aunque venga en la misma línea que la etiqueta', () => {
    const r = parsePromerica(fixture.replace(/Monto[ \t]*\r?\n\s*CRC: 2,500.00/, 'Monto    CRC: 2,500.00'))
    expect(r).toMatchObject({ ok: true, purchase: { amount: 2500 } })
  })

  it('no confunde "Tipo de Comercio" con "Comercio"', () => {
    const r = parsePromerica(fixture)
    expect(r).toMatchObject({ ok: true, purchase: { merchant: 'TACO BELL CITY MALL ALAJUELA CRI' } })
  })

  it('falla si el correo no confirma que la transacción fue exitosa', () => {
    const r = parsePromerica(fixture.replace('¡Tu transacción fue realizada con éxito!', '¡Tu transacción fue rechazada!'))
    expect(r).toEqual({ ok: false, reason: 'Promerica: el correo no confirma una transacción realizada con éxito' })
  })

  it('falla si la fecha no se reconoce', () => {
    const r = parsePromerica(fixture.replace('29 sep 2026 / 13:05', 'ayer'))
    expect(r.ok).toBe(false)
  })

  it('acepta el mes en mayo y diciembre en español', () => {
    const may = parsePromerica(fixture.replace('29 sep 2026', '3 may 2026'))
    const dic = parsePromerica(fixture.replace('29 sep 2026', '24 dic 2026'))
    expect(may).toMatchObject({ ok: true, purchase: { occurredAt: '2026-05-03T13:05:00-06:00' } })
    expect(dic).toMatchObject({ ok: true, purchase: { occurredAt: '2026-12-24T13:05:00-06:00' } })
  })

  it('falla con un correo que no es una alerta', () => {
    expect(parsePromerica('Descubrí nuestras promociones').ok).toBe(false)
  })
})
