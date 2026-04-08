import { roundMoney } from '@/lib/transactions'
import type { CategoryType } from '@/types/database'

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
}

type TransactionForCategory = {
  amount_crc: number
  category_type: CategoryType
  categoryId: string
  categoryName: string
  categoryColor: string
}

type TransactionForMonthly = {
  amount_crc: number
  category_type: CategoryType
  month: string  // YYYY-MM
}

export function groupExpensesByCategory(
  transactions: TransactionForCategory[]
): CategoryExpense[] {
  const map = new Map<string, CategoryExpense>()
  for (const t of transactions) {
    if (t.category_type !== 'fixed_expense' && t.category_type !== 'variable_expense') continue
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
    const row = map.get(t.month) ?? { month: t.month, income: 0, expenses: 0, savings: 0 }
    if (t.category_type === 'income') {
      row.income = roundMoney(row.income + t.amount_crc)
    } else if (t.category_type === 'fixed_expense' || t.category_type === 'variable_expense') {
      row.expenses = roundMoney(row.expenses + t.amount_crc)
    } else if (t.category_type === 'savings') {
      row.savings = roundMoney(row.savings + t.amount_crc)
    }
    map.set(t.month, row)
  }
  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month))
}
