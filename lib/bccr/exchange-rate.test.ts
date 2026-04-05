import { describe, expect, it } from 'vitest'
import { parseBCCRIndicatorResponse } from './exchange-rate'

describe('parseBCCRIndicatorResponse', () => {
  it('parses escaped XML payloads returned by the BCCR service', () => {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<string xmlns="http://ws.sdde.bccr.fi.cr">&lt;Datos_de_INGC011_CAT_INDICADORECONOMIC&gt;
  &lt;INGC011_CAT_INDICADORECONOMIC&gt;
    &lt;COD_INDICADORINTERNO&gt;318&lt;/COD_INDICADORINTERNO&gt;
    &lt;DES_FECHA&gt;2026-04-03T00:00:00-06:00&lt;/DES_FECHA&gt;
    &lt;NUM_VALOR&gt;512.34000000&lt;/NUM_VALOR&gt;
  &lt;/INGC011_CAT_INDICADORECONOMIC&gt;
  &lt;INGC011_CAT_INDICADORECONOMIC&gt;
    &lt;COD_INDICADORINTERNO&gt;318&lt;/COD_INDICADORINTERNO&gt;
    &lt;DES_FECHA&gt;2026-04-04T00:00:00-06:00&lt;/DES_FECHA&gt;
    &lt;NUM_VALOR&gt;513.12000000&lt;/NUM_VALOR&gt;
  &lt;/INGC011_CAT_INDICADORECONOMIC&gt;
&lt;/Datos_de_INGC011_CAT_INDICADORECONOMIC&gt;</string>`

    expect(parseBCCRIndicatorResponse(xml)).toEqual([
      {
        code: '318',
        date: '2026-04-03',
        value: 512.34,
      },
      {
        code: '318',
        date: '2026-04-04',
        value: 513.12,
      },
    ])
  })

  it('throws when the response does not contain indicator rows', () => {
    expect(() =>
      parseBCCRIndicatorResponse('<string xmlns="http://ws.sdde.bccr.fi.cr">Nothing</string>')
    ).toThrow('El BCCR no devolvió valores para el rango consultado.')
  })
})
