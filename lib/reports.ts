import { roundMoney } from '@/lib/transactions'
import { formatMoney } from '@/lib/format'
import type { CategoryType, TransactionType } from '@/types/database'

export type CategoryExpense = {
  categoryId: string
  categoryName: string
  categoryColor: string
  totalCRC: number
}

export type MonthlyTotalsRow = {
  month: string  // YYYY-MM
  income: number
  expenses: number
  savings: number
  reimbursements: number
  netExpenses: number
}

export type TransactionTypeBreakdown = {
  type: TransactionType
  label: string
  totalCRC: number
  count: number
}

export function getPreviousMonthKey(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number)
  const previous = new Date(Date.UTC(year, monthNumber - 2, 1))
  return `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, '0')}`
}

export function getMonthOverMonthLabel(current: number, previous: number | null): string {
  if (previous === null) return 'Sin datos del mes anterior'

  const difference = roundMoney(current - previous)
  if (difference === 0) return 'Sin cambio vs. mes anterior'

  const direction = difference > 0 ? 'más' : 'menos'
  if (previous <= 0) {
    return `Cambio de ${formatMoney(Math.abs(difference), 'CRC')} vs. mes anterior`
  }

  const percent = Math.round((Math.abs(difference) / previous) * 100)
  return `${percent}% ${direction} que el mes anterior`
}

const TYPE_LABELS: Record<TransactionType, string> = {
  personal: 'Personal',
  household: 'Hogar',
  reimbursement: 'Reembolso',
}

type TransactionForCategory = {
  amount_crc: number
  category_type: CategoryType
  categoryId: string
  categoryName: string
  categoryColor: string
  transaction_type?: TransactionType | null
}

type TransactionForMonthly = {
  amount_crc: number
  category_type: CategoryType
  month: string
  transaction_type?: TransactionType | null
}

type TransactionForType = {
  amount_crc: number
  transaction_type: TransactionType
  category_type?: CategoryType
}

export function groupExpensesByCategory(
  transactions: TransactionForCategory[]
): CategoryExpense[] {
  const map = new Map<string, CategoryExpense>()
  for (const t of transactions) {
    if (t.category_type !== 'fixed_expense' && t.category_type !== 'variable_expense') continue
    // Reimbursements are tracked separately — still show in category spend as gross
    const entry = map.get(t.categoryId)
    if (entry) {
      entry.totalCRC = roundMoney(entry.totalCRC + t.amount_crc)
    } else {
      map.set(t.categoryId, {
        categoryId: t.categoryId,
        categoryName: t.categoryName,
        categoryColor: t.categoryColor,
        totalCRC: t.amount_crc,
      })
    }
  }
  return [...map.values()].sort((a, b) => b.totalCRC - a.totalCRC)
}

export function buildMonthlyTotals(
  transactions: TransactionForMonthly[]
): MonthlyTotalsRow[] {
  const map = new Map<string, MonthlyTotalsRow>()
  for (const t of transactions) {
    const row = map.get(t.month) ?? {
      month: t.month,
      income: 0,
      expenses: 0,
      savings: 0,
      reimbursements: 0,
      netExpenses: 0,
    }
    if (t.category_type === 'income') {
      row.income = roundMoney(row.income + t.amount_crc)
    } else if (t.category_type === 'fixed_expense' || t.category_type === 'variable_expense') {
      row.expenses = roundMoney(row.expenses + t.amount_crc)
      if (t.transaction_type === 'reimbursement') {
        row.reimbursements = roundMoney(row.reimbursements + t.amount_crc)
      }
    } else if (t.category_type === 'savings') {
      row.savings = roundMoney(row.savings + t.amount_crc)
    }
    row.netExpenses = roundMoney(row.expenses - row.reimbursements)
    map.set(t.month, row)
  }
  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month))
}

export function groupByTransactionType(
  transactions: TransactionForType[],
): TransactionTypeBreakdown[] {
  const map = new Map<TransactionType, TransactionTypeBreakdown>()
  for (const t of transactions) {
    const type = t.transaction_type
    const entry = map.get(type) ?? {
      type,
      label: TYPE_LABELS[type],
      totalCRC: 0,
      count: 0,
    }
    entry.totalCRC = roundMoney(entry.totalCRC + t.amount_crc)
    entry.count += 1
    map.set(type, entry)
  }

  const order: TransactionType[] = ['personal', 'household', 'reimbursement']
  return order
    .map(t => map.get(t))
    .filter((x): x is TransactionTypeBreakdown => Boolean(x))
}

export function computeReportMonthSummary(transactions: TransactionForMonthly[]) {
  const totals = {
    income: 0,
    expenses: 0,
    savings: 0,
    reimbursements: 0,
  }
  for (const t of transactions) {
    if (t.category_type === 'income') totals.income += t.amount_crc
    else if (t.category_type === 'savings') totals.savings += t.amount_crc
    else if (t.category_type === 'fixed_expense' || t.category_type === 'variable_expense') {
      totals.expenses += t.amount_crc
      if (t.transaction_type === 'reimbursement') totals.reimbursements += t.amount_crc
    }
  }
  return {
    income: roundMoney(totals.income),
    expenses: roundMoney(totals.expenses),
    savings: roundMoney(totals.savings),
    reimbursements: roundMoney(totals.reimbursements),
    netExpenses: roundMoney(totals.expenses - totals.reimbursements),
    netSavings: roundMoney(totals.income - (totals.expenses - totals.reimbursements)),
    freeBalance: roundMoney(totals.income - (totals.expenses - totals.reimbursements) - totals.savings),
    balance: roundMoney(totals.income - (totals.expenses - totals.reimbursements) - totals.savings),
  }
}
