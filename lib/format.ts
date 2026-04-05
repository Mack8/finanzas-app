import type { CurrencyCode } from '@/types/database'

const formatters: Record<CurrencyCode, Intl.NumberFormat> = {
  CRC: new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'CRC',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }),
  USD: new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }),
}

const dateFormatter = new Intl.DateTimeFormat('es-CR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

export function formatMoney(amount: number, currency: CurrencyCode) {
  return formatters[currency].format(amount)
}

export function formatDate(date: string) {
  return dateFormatter.format(new Date(`${date}T00:00:00`))
}
