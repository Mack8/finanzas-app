import type { SupabaseClient } from '@supabase/supabase-js'
import type { CategoryType, CurrencyCode } from '@/types/database'
import type { Database } from '@/types/database'
import { roundMoney } from '@/lib/transactions'

export type TransactionForSummary = {
  amount_crc: number
  category_type: CategoryType
}

export type MonthTotals = {
  income: number
  expenses: number
  savings: number
  balance: number
}

export type BudgetProgressItem = {
  categoryId: string
  categoryName: string
  categoryColor: string
  spentCRC: number
  budgetAmount: number
  budgetCurrency: CurrencyCode
  budgetCRC: number
  usedPercent: number
}

export type DashboardSummary = {
  totals: MonthTotals
  budgetProgress: BudgetProgressItem[]
}

// --- Pure helpers (unit tested) ---

export function computeTotals(transactions: TransactionForSummary[]): MonthTotals {
  const income = transactions
    .filter(t => t.category_type === 'income')
    .reduce((sum, t) => sum + t.amount_crc, 0)

  const expenses = transactions
    .filter(t => t.category_type === 'fixed_expense' || t.category_type === 'variable_expense')
    .reduce((sum, t) => sum + t.amount_crc, 0)

  const savings = transactions
    .filter(t => t.category_type === 'savings')
    .reduce((sum, t) => sum + t.amount_crc, 0)

  return {
    income: roundMoney(income),
    expenses: roundMoney(expenses),
    savings: roundMoney(savings),
    balance: roundMoney(income - expenses - savings),
  }
}

export function computeBudgetProgress(
  spentCRC: number,
  budgetAmount: number,
  exchangeRateMultiplier: number
): { budgetCRC: number; usedPercent: number } {
  const budgetCRC = roundMoney(budgetAmount * exchangeRateMultiplier)
  const usedPercent = budgetCRC > 0 ? (spentCRC / budgetCRC) * 100 : 0
  return { budgetCRC, usedPercent }
}

// Returns current year/month in Costa Rica timezone
export function getCurrentMonthCR(): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Costa_Rica',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date())

  return {
    year: Number(parts.find(p => p.type === 'year')?.value ?? new Date().getFullYear()),
    month: Number(parts.find(p => p.type === 'month')?.value ?? new Date().getMonth() + 1),
  }
}

// --- Supabase orchestrator ---

export async function getDashboardSummary(
  supabase: SupabaseClient<Database>,
  year: number,
  month: number
): Promise<DashboardSummary> {
  const monthStr = String(month).padStart(2, '0')
  const lastDay = new Date(year, month, 0).getDate()
  const dateFrom = `${year}-${monthStr}-01`
  const dateTo = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`

  const [{ data: txData }, { data: catData }, { data: rateData }] = await Promise.all([
    supabase
      .from('transactions')
      .select('amount_crc, category_id, category:categories(type)')
      .gte('date', dateFrom)
      .lte('date', dateTo),
    supabase
      .from('categories')
      .select('id, name, color, monthly_budget_amount, monthly_budget_currency')
      .eq('is_active', true)
      .not('monthly_budget_amount', 'is', null),
    supabase
      .from('exchange_rates')
      .select('usd_to_crc')
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const transactions = (txData ?? []).map(t => ({
    amount_crc: t.amount_crc,
    category_type: ((t.category as { type: CategoryType } | null)?.type) ?? 'variable_expense' as CategoryType,
  }))

  const totals = computeTotals(transactions)

  const spentByCategory = new Map<string, number>()
  for (const t of txData ?? []) {
    if (t.category_id) {
      spentByCategory.set(
        t.category_id,
        (spentByCategory.get(t.category_id) ?? 0) + t.amount_crc
      )
    }
  }

  const usdToCRC = rateData?.usd_to_crc ?? 1

  const budgetProgress: BudgetProgressItem[] = (catData ?? [])
    .map(cat => {
      const spentCRC = spentByCategory.get(cat.id) ?? 0
      const multiplier = cat.monthly_budget_currency === 'USD' ? usdToCRC : 1
      const { budgetCRC, usedPercent } = computeBudgetProgress(
        spentCRC,
        cat.monthly_budget_amount!,
        multiplier
      )
      return {
        categoryId: cat.id,
        categoryName: cat.name,
        categoryColor: cat.color,
        spentCRC,
        budgetAmount: cat.monthly_budget_amount!,
        budgetCurrency: cat.monthly_budget_currency as CurrencyCode,
        budgetCRC,
        usedPercent,
      }
    })
    .sort((a, b) => b.usedPercent - a.usedPercent)

  return { totals, budgetProgress }
}
