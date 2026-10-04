import { createAdminClient } from '@/lib/supabase/admin'
import type { ExchangeRate } from '@/types/domain'
import type { ExchangeRateSnapshot } from '@/lib/transactions'

const BCCR_EXCHANGE_RATE_SALE_INDICATOR = '318'
const BCCR_EXCHANGE_RATE_SOURCE = 'bccr:venta:318'
const BCCR_TIMEZONE = 'America/Costa_Rica'
const BCCR_LOOKBACK_DAYS = 7

export type ExchangeRateResolution = ExchangeRate & {
  resolvedFrom: 'cache' | 'remote'
  indicatorCode: typeof BCCR_EXCHANGE_RATE_SALE_INDICATOR
}

type ParsedBCCRIndicatorValue = {
  code: string
  date: string
  value: number
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

function getDatePartsInCostaRica(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BCCR_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  return {
    year: parts.find(part => part.type === 'year')?.value ?? '0000',
    month: parts.find(part => part.type === 'month')?.value ?? '01',
    day: parts.find(part => part.type === 'day')?.value ?? '01',
  }
}

function formatDateForDatabase(date: Date) {
  const { year, month, day } = getDatePartsInCostaRica(date)
  return `${year}-${month}-${day}`
}

function formatDateForBCCR(date: Date) {
  const { day, month, year } = getDatePartsInCostaRica(date)
  return `${day}/${month}/${year}`
}

/** Parse YYYY-MM-DD as noon UTC to avoid TZ edge shifts when formatting for BCCR. */
export function parseISODateOnly(dateStr: string): Date {
  if (!DATE_REGEX.test(dateStr)) {
    throw new Error('Fecha inválida. Usá el formato YYYY-MM-DD.')
  }
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
}

function subtractDays(date: Date, days: number) {
  const result = new Date(date)
  result.setUTCDate(result.getUTCDate() - days)
  return result
}

function decodeXmlEntities(value: string) {
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
}

function extractTagValue(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))
  return match?.[1]?.trim() ?? null
}

export function parseBCCRIndicatorResponse(xml: string): ParsedBCCRIndicatorValue[] {
  const outerMatch = xml.match(/<string[^>]*>([\s\S]*?)<\/string>/i)

  if (!outerMatch) {
    throw new Error('La respuesta del BCCR no tiene el formato esperado.')
  }

  const decodedPayload = decodeXmlEntities(outerMatch[1].trim())
  const blocks = decodedPayload.match(
    /<INGC011_CAT_INDICADORECONOMIC>([\s\S]*?)<\/INGC011_CAT_INDICADORECONOMIC>/g
  )

  if (!blocks || blocks.length === 0) {
    throw new Error('El BCCR no devolvió valores para el rango consultado.')
  }

  return blocks
    .map(block => {
      const code = extractTagValue(block, 'COD_INDICADORINTERNO')
      const rawDate = extractTagValue(block, 'DES_FECHA')
      const rawValue = extractTagValue(block, 'NUM_VALOR')

      if (!code || !rawDate || !rawValue) {
        return null
      }

      const value = Number.parseFloat(rawValue.replace(',', '.'))

      if (!Number.isFinite(value)) {
        return null
      }

      return {
        code,
        date: rawDate.slice(0, 10),
        value,
      }
    })
    .filter((entry): entry is ParsedBCCRIndicatorValue => entry !== null)
    .sort((left, right) => left.date.localeCompare(right.date))
}

async function fetchExchangeRatesFromBCCR(startDate: Date, endDate: Date) {
  const email = process.env.BCCR_INDICATOR_EMAIL
  const token = process.env.BCCR_INDICATOR_TOKEN

  if (!email || !token) {
    throw new Error('Falta configurar BCCR_INDICATOR_EMAIL o BCCR_INDICATOR_TOKEN.')
  }

  const url = new URL(
    'https://gee.bccr.fi.cr/Indicadores/Suscripciones/WS/wsindicadoreseconomicos.asmx/ObtenerIndicadoresEconomicosXML'
  )

  url.searchParams.set('Indicador', BCCR_EXCHANGE_RATE_SALE_INDICATOR)
  url.searchParams.set('FechaInicio', formatDateForBCCR(startDate))
  url.searchParams.set('FechaFinal', formatDateForBCCR(endDate))
  url.searchParams.set('Nombre', 'FinanzasApp')
  url.searchParams.set('SubNiveles', 'N')
  url.searchParams.set('CorreoElectronico', email)
  url.searchParams.set('Token', token)

  const response = await fetch(url, {
    cache: 'no-store',
    headers: {
      Accept: 'text/xml',
    },
  })

  if (!response.ok) {
    throw new Error(`El BCCR respondió con estado ${response.status}.`)
  }

  return parseBCCRIndicatorResponse(await response.text())
}

export function isExchangeRateSyncConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.BCCR_INDICATOR_EMAIL &&
    process.env.BCCR_INDICATOR_TOKEN
  )
}

function toResolution(
  row: ExchangeRate,
  resolvedFrom: 'cache' | 'remote',
): ExchangeRateResolution {
  return {
    ...row,
    resolvedFrom,
    indicatorCode: BCCR_EXCHANGE_RATE_SALE_INDICATOR,
  }
}

export function toExchangeRateSnapshot(
  rate: Pick<ExchangeRate, 'id' | 'date' | 'usd_to_crc'> | null | undefined,
): ExchangeRateSnapshot | null {
  if (!rate) return null
  return { id: rate.id, date: rate.date, usd_to_crc: rate.usd_to_crc }
}

/** Reads a recent cached rate only. This helper never contacts BCCR or writes to Supabase. */
export async function getCachedExchangeRateForDate(dateStr: string) {
  const admin = createAdminClient()
  const target = DATE_REGEX.test(dateStr) ? dateStr : formatDateForDatabase(new Date())
  const targetDate = parseISODateOnly(target)
  const lookbackStart = formatDateForDatabase(subtractDays(targetDate, BCCR_LOOKBACK_DAYS))

  const { data: cachedRows, error } = await admin
    .from('exchange_rates')
    .select('*')
    .lte('date', target)
    .gte('date', lookbackStart)
    .order('date', { ascending: false })
    .limit(1)

  if (error) {
    throw new Error('No se pudo consultar el cache local de tipo de cambio.')
  }

  const cached = cachedRows?.[0]
  return cached ? toResolution(cached, 'cache') : null
}

/**
 * Rate for a specific operation date (YYYY-MM-DD).
 * Uses cache: exact date, else nearest prior date within lookback.
 * Optionally fetches remote BCCR range when missing.
 */
export async function getExchangeRateForDate(
  dateStr: string,
  options?: { ensureFresh?: boolean },
): Promise<ExchangeRateResolution | null> {
  const admin = createAdminClient()
  const target = DATE_REGEX.test(dateStr) ? dateStr : formatDateForDatabase(new Date())
  const targetDate = parseISODateOnly(target)
  const lookbackStart = formatDateForDatabase(subtractDays(targetDate, BCCR_LOOKBACK_DAYS))

  const { data: cachedRows, error: cacheError } = await admin
    .from('exchange_rates')
    .select('*')
    .lte('date', target)
    .gte('date', lookbackStart)
    .order('date', { ascending: false })
    .limit(1)

  if (cacheError) {
    throw new Error('No se pudo consultar el cache local de tipo de cambio.')
  }

  const cached = cachedRows?.[0] ?? null
  if (cached && (!options?.ensureFresh || cached.date === target)) {
    return toResolution(cached, 'cache')
  }

  // Also accept nearest prior even without ensureFresh
  if (cached && !options?.ensureFresh) {
    return toResolution(cached, 'cache')
  }

  if (!options?.ensureFresh || !isExchangeRateSyncConfigured()) {
    // Wider fallback: any rate on or before target
    if (cached) return toResolution(cached, 'cache')

    const { data: anyPrior } = await admin
      .from('exchange_rates')
      .select('*')
      .lte('date', target)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle()

    return anyPrior ? toResolution(anyPrior, 'cache') : null
  }

  // Remote fetch covering lookback → target
  const remoteValues = await fetchExchangeRatesFromBCCR(
    subtractDays(targetDate, BCCR_LOOKBACK_DAYS),
    targetDate,
  )

  if (remoteValues.length === 0) {
    return cached ? toResolution(cached, 'cache') : null
  }

  // Upsert all returned days to warm cache
  const upserts = remoteValues.map(v => ({
    date: v.date,
    usd_to_crc: v.value,
    source: BCCR_EXCHANGE_RATE_SOURCE,
  }))

  const { error: upsertError } = await admin
    .from('exchange_rates')
    .upsert(upserts, { onConflict: 'date' })

  if (upsertError) {
    throw new Error('No se pudo guardar el tipo de cambio en Supabase.')
  }

  // Prefer exact date, else latest remote ≤ target
  const bestRemote =
    remoteValues.find(v => v.date === target)
    ?? [...remoteValues].reverse().find(v => v.date <= target)
    ?? remoteValues.at(-1)

  if (!bestRemote) {
    return cached ? toResolution(cached, 'cache') : null
  }

  const { data: saved, error: readError } = await admin
    .from('exchange_rates')
    .select('*')
    .eq('date', bestRemote.date)
    .maybeSingle()

  if (readError || !saved) {
    throw new Error('No se pudo leer el tipo de cambio guardado.')
  }

  return toResolution(saved, 'remote')
}

export async function getLatestExchangeRate(options?: { ensureFresh?: boolean }) {
  const today = formatDateForDatabase(new Date())

  if (options?.ensureFresh) {
    return getExchangeRateForDate(today, { ensureFresh: true })
  }

  const admin = createAdminClient()
  const { data: latestCachedRate, error: latestCachedRateError } = await admin
    .from('exchange_rates')
    .select('*')
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestCachedRateError) {
    throw new Error('No se pudo consultar el cache local de tipo de cambio.')
  }

  return latestCachedRate
    ? toResolution(latestCachedRate, 'cache')
    : null
}
