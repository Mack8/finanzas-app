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

export function formatPercent(value: number | null, digits = 1): string {
  if (value === null || Number.isNaN(value)) return '—'
  return `${value.toFixed(digits)}%`
}

export function formatSignedPercent(value: number | null, digits = 1): string {
  if (value === null || Number.isNaN(value)) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(digits)}%`
}
