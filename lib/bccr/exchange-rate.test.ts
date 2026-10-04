import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getCachedExchangeRateForDate, parseBCCRIndicatorResponse } from './exchange-rate'

const { from, upsert, query, rows } = vi.hoisted(() => {
  const state: { rows: Record<string, unknown>[] } = { rows: [] }
  const query: Record<string, ReturnType<typeof vi.fn>> = {}
  query.select = vi.fn(() => query)
  query.lte = vi.fn(() => query)
  query.gte = vi.fn(() => query)
  query.order = vi.fn(() => query)
  query.limit = vi.fn(async () => ({ data: state.rows, error: null }))
  const upsert = vi.fn()
  const from = vi.fn(() => ({ ...query, upsert }))
  return { from, upsert, query, rows: state }
})

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ from }) }))

beforeEach(() => {
  vi.clearAllMocks()
  rows.rows = []
})

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

describe('getCachedExchangeRateForDate', () => {
  it('lee la tasa previa dentro de siete días sin consultar ni escribir en BCCR/Supabase', async () => {
    rows.rows = [{ id: 'rate-1', date: '2026-09-25', usd_to_crc: 512.34, source: 'bccr:venta:318' }]
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    await expect(getCachedExchangeRateForDate('2026-09-29')).resolves.toMatchObject({
      id: 'rate-1', date: '2026-09-25', usd_to_crc: 512.34, resolvedFrom: 'cache',
    })

    expect(query.gte).toHaveBeenCalledWith('date', '2026-09-22')
    expect(upsert).not.toHaveBeenCalled()
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('no usa una tasa más antigua que el rango de siete días', async () => {
    rows.rows = []

    await expect(getCachedExchangeRateForDate('2026-09-29')).resolves.toBeNull()
    expect(query.lte).toHaveBeenCalledWith('date', '2026-09-29')
    expect(query.gte).toHaveBeenCalledWith('date', '2026-09-22')
    expect(upsert).not.toHaveBeenCalled()
  })
})
