import type { ParseResult } from '../types'
import { fail, labeled, missingFields, monthFromName, parseMoney, toCostaRicaIso } from './util'

export function parsePromerica(text: string): ParseResult {
  if (!/realizada\s+con\s+[eé]xito/i.test(text)) {
    return fail('Promerica: el correo no confirma una transacción realizada con éxito')
  }

  const merchant = labeled(text, 'Comercio')
  const hint = labeled(text, 'Tipo de Comercio')
  const dateRaw = labeled(text, 'Fecha\\/hora')
  const cardRaw = labeled(text, 'N[uú]mero de tarjeta')
  const authorization = labeled(text, 'N[uú]mero de autorizaci[oó]n')
  const reference = labeled(text, 'N[uú]mero de referencia')
  const moneyRaw = labeled(text, 'Monto')

  const absent = missingFields({
    comercio: merchant, fecha: dateRaw, tarjeta: cardRaw,
    autorización: authorization, referencia: reference, monto: moneyRaw,
  })
  if (absent.length > 0) return fail(`Promerica: faltan campos: ${absent.join(', ')}`)

  const date = dateRaw!.match(/^(\d{1,2}) ([A-Za-zñÑ]{3,4})\.? (\d{4}) \/ (\d{1,2}):(\d{2})$/)
  const month = date ? monthFromName(date[2]) : null
  const occurredAt = date && month
    ? toCostaRicaIso(Number(date[3]), month, Number(date[1]), Number(date[4]), Number(date[5]))
    : null
  if (!occurredAt) return fail(`Promerica: fecha no reconocida (${dateRaw})`)

  const cardLast4 = cardRaw!.match(/(\d{4})\s*$/)?.[1]
  if (!cardLast4) return fail('Promerica: tarjeta no reconocida')

  if (!/^\w+$/.test(authorization!) || !/^\w+$/.test(reference!)) {
    return fail('Promerica: autorización o referencia con formato inesperado')
  }

  const money = parseMoney(moneyRaw!)
  if (!money) return fail(`Promerica: monto no reconocido (${moneyRaw})`)

  return {
    ok: true,
    purchase: {
      bank: 'promerica',
      merchant: merchant!,
      merchantCategoryHint: hint,
      occurredAt,
      cardLast4,
      authorization: authorization!,
      reference: reference!,
      amount: money.amount,
      currency: money.currency,
    },
  }
}
