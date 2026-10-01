import type { ParseResult } from '../types'
import { fail, labeled, missingFields, monthFromName, parseMoney, toCostaRicaIso } from './util'

export function parseBac(text: string): ParseResult {
  const type = labeled(text, 'Tipo de Transacci[oó]n')
  if (type === null) return fail('BAC: falta el tipo de transacción')
  if (type.toUpperCase() !== 'COMPRA') {
    return fail(`BAC: tipo de transacción no soportado (${type})`)
  }

  const merchant = labeled(text, 'Comercio')
  const dateRaw = labeled(text, 'Fecha')
  const cardRaw = labeled(text, '(?:VISA|MASTERCARD|AMEX)')
  const authorization = labeled(text, 'Autorizaci[oó]n')
  const reference = labeled(text, 'Referencia')
  const moneyRaw = labeled(text, 'Monto')

  const absent = missingFields({
    comercio: merchant, fecha: dateRaw, tarjeta: cardRaw,
    autorización: authorization, referencia: reference, monto: moneyRaw,
  })
  if (absent.length > 0) return fail(`BAC: faltan campos: ${absent.join(', ')}`)

  const date = dateRaw!.match(/^([A-Za-z]{3,4})\.? (\d{1,2}), (\d{4}), (\d{1,2}):(\d{2})$/)
  const month = date ? monthFromName(date[1]) : null
  const occurredAt = date && month
    ? toCostaRicaIso(Number(date[3]), month, Number(date[2]), Number(date[4]), Number(date[5]))
    : null
  if (!occurredAt) return fail(`BAC: fecha no reconocida (${dateRaw})`)

  const cardLast4 = cardRaw!.match(/(\d{4})\s*$/)?.[1]
  if (!cardLast4) return fail('BAC: tarjeta no reconocida')

  if (!/^\w+$/.test(authorization!) || !/^\w+$/.test(reference!)) {
    return fail('BAC: autorización o referencia con formato inesperado')
  }

  const money = parseMoney(moneyRaw!)
  if (!money) return fail(`BAC: monto no reconocido (${moneyRaw})`)

  return {
    ok: true,
    purchase: {
      bank: 'bac',
      merchant: merchant!,
      merchantCategoryHint: null,
      occurredAt,
      cardLast4,
      authorization: authorization!,
      reference: reference!,
      amount: money.amount,
      currency: money.currency,
    },
  }
}
