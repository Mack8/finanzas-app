import type { CurrencyCode } from '@/types/database'

export type ExchangeRateSnapshot = {
  id: string
  date: string
  usd_to_crc: number
}

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

export function resolveAmountCRC(
  amount: number,
  currency: CurrencyCode,
  exchangeRate: ExchangeRateSnapshot | null
) {
  if (currency === 'CRC') {
    return {
      amountCRC: roundMoney(amount),
      exchangeRateId: null,
    }
  }

  if (!exchangeRate) {
    throw new Error('No hay tipo de cambio disponible para registrar montos en USD.')
  }

  return {
    amountCRC: roundMoney(amount * exchangeRate.usd_to_crc),
    exchangeRateId: exchangeRate.id,
  }
}
