// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { htmlToText } from '../graph/html'
import { parseBac } from './bac'
import { parsePromerica } from './promerica'

const read = (name: string) => readFileSync(join(__dirname, '__fixtures__', name), 'utf8')

// Graph entrega estas alertas en HTML (con tablas), no en texto plano: el worker las
// convierte con htmlToText antes de parsear.
describe('alertas en HTML', () => {
  it('BAC: el HTML sin convertir no se puede leer, convertido sí', () => {
    const html = read('bac-compra.html')
    expect(parseBac(html).ok).toBe(false)
    expect(parseBac(htmlToText(html))).toMatchObject({
      ok: true,
      purchase: { merchant: 'DLC* DIDI FOODS', amount: 3730, currency: 'CRC', cardLast4: '7001', occurredAt: '2026-09-29T19:47:00-06:00' },
    })
  })

  it('Promerica: el HTML sin convertir no se puede leer, convertido sí', () => {
    const html = read('promerica-compra.html')
    expect(parsePromerica(html).ok).toBe(false)
    expect(parsePromerica(htmlToText(html))).toMatchObject({
      ok: true,
      purchase: { merchant: 'TACO BELL CITY MALL ALAJUELA CRI', merchantCategoryHint: 'RESTAURANTS', amount: 2500, cardLast4: '7003' },
    })
  })
})
