import { NextResponse } from 'next/server'
import { getLatestExchangeRate, isExchangeRateSyncConfigured } from '@/lib/bccr/exchange-rate'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const exchangeRate = await getLatestExchangeRate({ ensureFresh: true })

    if (!exchangeRate) {
      return NextResponse.json(
        {
          error: isExchangeRateSyncConfigured()
            ? 'No se encontró tipo de cambio disponible.'
            : 'Falta configurar BCCR o la llave service_role para sincronizar el tipo de cambio.',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      date: exchangeRate.date,
      usdToCrc: exchangeRate.usd_to_crc,
      source: exchangeRate.source,
      resolvedFrom: exchangeRate.resolvedFrom,
      indicatorCode: exchangeRate.indicatorCode,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'No se pudo sincronizar el tipo de cambio.',
      },
      { status: 500 }
    )
  }
}
