import type { ParseResult } from '../types'
import { fail, parseAmount, parseCurrency, to24h, toCostaRicaIso } from './util'

// La fecha de DAVIbank es numérica: DD/MM/AAAA y hora de 12 h.

const SENTENCE = new RegExp(
  'transacci[oó]n\\s+realizada\\s+en\\s+([\\s\\S]+?),\\s+el\\s+d[ií]a\\s+(\\d{1,2})\\/(\\d{1,2})\\/(\\d{4})' +
  '\\s+a\\s+las\\s+(\\d{1,2}):(\\d{2})\\s*(AM|PM)\\s+con\\s+su\\s+tarjeta[\\s\\S]*?' +
  'terminada\\s+en\\s+(\\d{4})\\s+con\\s+n[uú]mero\\s+de\\s+autorizaci[oó]n\\s+(\\w+)\\s+' +
  'y\\s+referencia\\s+(\\w+)\\s+por\\s+([A-Za-z]{3})\\s+([\\d.,]+?),?\\s+fue\\s+(\\w+)',
  'i',
)

export function parseDavibank(text: string): ParseResult {
  const m = text.match(SENTENCE)
  if (!m) return fail('DAVIbank: la frase de la transacción no coincide con la plantilla')

  const status = m[13].toLowerCase()
  if (status !== 'aprobada') return fail(`DAVIbank: la transacción no fue aprobada (${status})`)

  const merchant = m[1].replace(/\s+/g, ' ').replace(/\s+Costa Rica$/i, '').trim()
  if (!merchant) return fail('DAVIbank: comercio vacío')

  const hour = to24h(Number(m[5]), m[7])
  const occurredAt = hour === null
    ? null
    : toCostaRicaIso(Number(m[4]), Number(m[3]), Number(m[2]), hour, Number(m[6]))
  if (!occurredAt) return fail(`DAVIbank: fecha no reconocida (${m[2]}/${m[3]}/${m[4]} ${m[5]}:${m[6]} ${m[7]})`)

  const currency = parseCurrency(m[11])
  const amount = parseAmount(m[12])
  if (!currency || amount === null) return fail(`DAVIbank: monto no reconocido (${m[11]} ${m[12]})`)

  return {
    ok: true,
    purchase: {
      bank: 'davibank',
      merchant,
      merchantCategoryHint: null,
      occurredAt,
      cardLast4: m[8],
      authorization: m[9],
      reference: m[10],
      amount,
      currency,
    },
  }
}
