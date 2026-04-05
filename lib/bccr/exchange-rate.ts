import { createAdminClient } from '@/lib/supabase/admin'
import type { ExchangeRate } from '@/types/domain'

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

async function fetchLatestExchangeRateFromBCCR() {
  const email = process.env.BCCR_INDICATOR_EMAIL
  const token = process.env.BCCR_INDICATOR_TOKEN

  if (!email || !token) {
    throw new Error('Falta configurar BCCR_INDICATOR_EMAIL o BCCR_INDICATOR_TOKEN.')
  }

  const today = new Date()
  const startDate = subtractDays(today, BCCR_LOOKBACK_DAYS)

  const url = new URL(
    'https://gee.bccr.fi.cr/Indicadores/Suscripciones/WS/wsindicadoreseconomicos.asmx/ObtenerIndicadoresEconomicosXML'
  )

  url.searchParams.set('Indicador', BCCR_EXCHANGE_RATE_SALE_INDICATOR)
  url.searchParams.set('FechaInicio', formatDateForBCCR(startDate))
  url.searchParams.set('FechaFinal', formatDateForBCCR(today))
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

  const parsedValues = parseBCCRIndicatorResponse(await response.text())
  const latestValue = parsedValues.at(-1)

  if (!latestValue) {
    throw new Error('No se encontró un tipo de cambio utilizable en la respuesta del BCCR.')
  }

  return latestValue
}

export function isExchangeRateSyncConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.BCCR_INDICATOR_EMAIL &&
    process.env.BCCR_INDICATOR_TOKEN
  )
}

export async function getLatestExchangeRate(options?: { ensureFresh?: boolean }) {
  const admin = createAdminClient()
  const today = formatDateForDatabase(new Date())

  const { data: latestCachedRate, error: latestCachedRateError } = await admin
    .from('exchange_rates')
    .select('*')
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestCachedRateError) {
    throw new Error('No se pudo consultar el cache local de tipo de cambio.')
  }

  if (!options?.ensureFresh) {
    return latestCachedRate
      ? {
          ...latestCachedRate,
          resolvedFrom: 'cache' as const,
          indicatorCode: BCCR_EXCHANGE_RATE_SALE_INDICATOR,
        }
      : null
  }

  if (latestCachedRate?.date === today) {
    return {
      ...latestCachedRate,
      resolvedFrom: 'cache' as const,
      indicatorCode: BCCR_EXCHANGE_RATE_SALE_INDICATOR,
    }
  }

  if (!isExchangeRateSyncConfigured()) {
    return latestCachedRate
      ? {
          ...latestCachedRate,
          resolvedFrom: 'cache' as const,
          indicatorCode: BCCR_EXCHANGE_RATE_SALE_INDICATOR,
        }
      : null
  }

  const latestRemoteRate = await fetchLatestExchangeRateFromBCCR()

  const { data: upsertedRate, error: upsertError } = await admin
    .from('exchange_rates')
    .upsert(
      {
        date: latestRemoteRate.date,
        usd_to_crc: latestRemoteRate.value,
        source: BCCR_EXCHANGE_RATE_SOURCE,
      },
      {
        onConflict: 'date',
      }
    )
    .select('*')
    .single()

  if (upsertError) {
    throw new Error('No se pudo guardar el tipo de cambio en Supabase.')
  }

  return {
    ...upsertedRate,
    resolvedFrom: 'remote' as const,
    indicatorCode: BCCR_EXCHANGE_RATE_SALE_INDICATOR,
  }
}
