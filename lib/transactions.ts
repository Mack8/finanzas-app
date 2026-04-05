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

export type TransactionFilters = {
  dateFrom?: string
  dateTo?: string
  categoryId?: string
  transactionType?: 'personal' | 'household' | 'reimbursement'
  currency?: 'CRC' | 'USD'
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/
const VALID_TYPES = ['personal', 'household', 'reimbursement'] as const
const VALID_CURRENCIES = ['CRC', 'USD'] as const

export function buildTransactionFilters(
  params: Record<string, string | string[] | undefined>
): TransactionFilters {
  const filters: TransactionFilters = {}

  const month = typeof params.month === 'string' ? params.month : undefined
  if (month && MONTH_REGEX.test(month)) {
    const [year, m] = month.split('-').map(Number)
    const lastDay = new Date(year, m, 0).getDate()
    filters.dateFrom = `${month}-01`
    filters.dateTo = `${month}-${String(lastDay).padStart(2, '0')}`
  }

  const categoryId = typeof params.categoryId === 'string' ? params.categoryId : undefined
  if (categoryId && UUID_REGEX.test(categoryId)) {
    filters.categoryId = categoryId
  }

  const type = typeof params.type === 'string' ? params.type : undefined
  if (type && (VALID_TYPES as readonly string[]).includes(type)) {
    filters.transactionType = type as TransactionFilters['transactionType']
  }

  const currency = typeof params.currency === 'string' ? params.currency : undefined
  if (currency && (VALID_CURRENCIES as readonly string[]).includes(currency)) {
    filters.currency = currency as TransactionFilters['currency']
  }

  return filters
}
