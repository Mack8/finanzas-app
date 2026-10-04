import type { SupabaseClient } from '@supabase/supabase-js'
import type { CategoryType, CurrencyCode, TransactionType } from '@/types/database'
import type { Database } from '@/types/database'
import type { PaymentReminder } from '@/types/domain'
import { roundMoney } from '@/lib/transactions'
import { classifyDueDate, monthlyDueDatesInWindow } from '@/lib/payment-schedule'
import { computeMonthlyIncomeCRC } from '@/lib/income'
import { buildMonthlyTotals, groupExpensesByCategory } from '@/lib/reports'
import type { MonthlyTotalsRow, CategoryExpense } from '@/lib/reports'
import {
  computeLedgerTotals,
  computeProjectedCashFlow,
  type LedgerTotals,
} from '@/lib/ledger'

export type TransactionForSummary = {
  amount_crc: number
  category_type: CategoryType
  transaction_type?: TransactionType | null
}

export type MonthTotals = {
  income: number
  expenses: number
  savings: number
  balance: number
  reimbursements?: number
  netExpenses?: number
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
  fixedExpenses: number
  variableExpenses: number
  transactionCount: number
}

export type MomChange = {
  current: number
  previous: number
  delta: number
  percent: number | null
}

export type FinancialRates = {
  savingsRate: number | null
  expenseRate: number | null
  fixedShare: number | null
  variableShare: number | null
}

export type CashFlowBreakdown = {
  /** Ledger income this month */
  ledgerIncomeCRC: number
  /** Configured salary (may be null) */
  salaryIncomeCRC: number | null
  /** Gross expenses from ledger */
  expensesCRC: number
  netExpensesCRC: number
  reimbursementsCRC: number
  /** Savings txs from ledger */
  savingsCRC: number
  /** Active debts still reserved this month (no linked occurrence transaction) */
  unpaidDebtsMonthlyCRC: number
  /** Active recurring obligations due this month and not paid yet */
  unpaidRecurringMonthlyCRC: number
  /** Planned contributions not yet made */
  pendingPlannedContributionsCRC: number
  /** True ledger balance */
  availableCRC: number
  /** Projection including unpaid plan items + salary fallback */
  projectedAvailableCRC: number
  usedSalaryFallback: boolean
}

export type MonthPace = {
  dayOfMonth: number
  daysInMonth: number
  elapsedPercent: number
  projectedExpenses: number | null
  dailyBurn: number
}

export type FinancialPositionInput = {
  confirmedCRC: number
  pendingCommitmentsCRC: number
  futureIncomeCRC: number | null
  horizonDays: number
  projectedExpensesCRC: number
}

export type FinancialPosition = {
  confirmedCRC: number
  pendingCommitmentsCRC: number
  safeCRC: number
  projectedCRC: number | null
  dailySafeCRC: number
  horizonDays: number
  state: 'stable' | 'attention' | 'risk' | 'incomplete'
}

export function computeFinancialPosition(input: FinancialPositionInput): FinancialPosition {
  const horizonDays = Math.max(1, input.horizonDays)
  const safeCRC = roundMoney(input.confirmedCRC - input.pendingCommitmentsCRC)
  const projectedCRC = input.futureIncomeCRC === null
    ? null
    : roundMoney(safeCRC + input.futureIncomeCRC)
  const state = safeCRC < 0
    ? 'risk'
    : input.projectedExpensesCRC > safeCRC
      ? 'attention'
      : input.futureIncomeCRC === null
        ? 'incomplete'
        : 'stable'

  return {
    confirmedCRC: input.confirmedCRC,
    pendingCommitmentsCRC: input.pendingCommitmentsCRC,
    safeCRC,
    projectedCRC,
    dailySafeCRC: roundMoney(safeCRC / horizonDays),
    horizonDays,
    state,
  }
}

type DebtReservation = {
  id: string
  monthly_amount_crc: number
  is_active: boolean
  next_due_date: string | null
}

type RecurringReservation = {
  id: string
  expected_amount_crc: number
  is_active: boolean
  next_due_date: string
}

type ScheduledPaymentLink = {
  debt_id: string | null
  recurring_obligation_id: string | null
  scheduled_due_date: string | null
}

export function computeMonthlyUnpaidCommitments(
  debts: DebtReservation[],
  obligations: RecurringReservation[],
  transactions: ScheduledPaymentLink[],
  year: number,
  month: number,
): { unpaidDebtsMonthlyCRC: number; unpaidRecurringMonthlyCRC: number } {
  const monthKey = `${year}-${String(month).padStart(2, '0')}`
  const unpaidDebtsMonthlyCRC = roundMoney(debts
    .filter(debt => debt.is_active)
    .filter(debt => {
      if (!debt.next_due_date) {
        return !transactions.some(tx => tx.debt_id === debt.id && tx.scheduled_due_date === null)
      }
      return debt.next_due_date.startsWith(`${monthKey}-`) && !transactions.some(tx =>
        tx.debt_id === debt.id && tx.scheduled_due_date === debt.next_due_date)
    })
    .reduce((sum, debt) => sum + debt.monthly_amount_crc, 0))

  const unpaidRecurringMonthlyCRC = roundMoney(obligations
    .filter(obligation => obligation.is_active && obligation.next_due_date.startsWith(`${monthKey}-`))
    .filter(obligation => !transactions.some(tx =>
      tx.recurring_obligation_id === obligation.id && tx.scheduled_due_date === obligation.next_due_date))
    .reduce((sum, obligation) => sum + obligation.expected_amount_crc, 0))

  return { unpaidDebtsMonthlyCRC, unpaidRecurringMonthlyCRC }
}

export async function getUpcomingPayments(
  supabase: SupabaseClient<Database>,
  userId: string,
  today: string,
): Promise<PaymentReminder[]> {
  const [debtsResult, obligationsResult, accountsResult] = await Promise.all([
    supabase.from('debts')
      .select('id, name, monthly_amount, currency, next_due_date, payment_account_id')
      .eq('user_id', userId)
      .eq('is_active', true),
    supabase.from('recurring_obligations')
      .select('id, name, expected_amount, currency, next_due_date, payment_account_id, is_active')
      .eq('user_id', userId)
      .eq('is_active', true),
    supabase.from('payment_accounts')
      .select('id, name, type, payment_due_day, is_active')
      .eq('user_id', userId)
      .eq('is_active', true),
  ])
  if (debtsResult.error || obligationsResult.error || accountsResult.error) {
    throw new Error('No se pudieron cargar los próximos pagos.')
  }
  return buildUpcomingPayments({
    today,
    debts: (debtsResult.data ?? []) as UpcomingDebt[],
    obligations: (obligationsResult.data ?? []) as UpcomingObligation[],
    accounts: (accountsResult.data ?? []) as UpcomingAccount[],
  })
}

type UpcomingDebt = Pick<DebtReservation, 'id' | 'next_due_date'> & {
  name: string
  monthly_amount: number
  currency: CurrencyCode
  payment_account_id: string | null
}

type UpcomingObligation = Pick<RecurringReservation, 'id' | 'is_active' | 'next_due_date'> & {
  name: string
  expected_amount: number
  currency: CurrencyCode
  payment_account_id: string | null
}

type UpcomingAccount = {
  id: string
  name: string
  type: 'credit_card' | 'bank_account'
  payment_due_day: number | null
  is_active: boolean
}

function addDays(date: string, days: number) {
  const [year, month, day] = date.split('-').map(Number)
  const target = new Date(Date.UTC(year, month - 1, day + days))
  return `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, '0')}-${String(target.getUTCDate()).padStart(2, '0')}`
}

export function buildUpcomingPayments({ today, debts, obligations, accounts }: {
  today: string
  debts: UpcomingDebt[]
  obligations: UpcomingObligation[]
  accounts: UpcomingAccount[]
}): PaymentReminder[] {
  const windowEnd = addDays(today, 30)
  const reminders: PaymentReminder[] = []
  for (const debt of debts) {
    if (!debt.next_due_date || debt.next_due_date > windowEnd) continue
    reminders.push({
      id: `debt:${debt.id}:${debt.next_due_date}`, kind: 'debt', name: debt.name,
      sourceId: debt.id, dueDate: debt.next_due_date,
      status: classifyDueDate(debt.next_due_date, today, false),
      amount: debt.monthly_amount, currency: debt.currency, paymentAccountId: debt.payment_account_id,
    })
  }
  for (const obligation of obligations) {
    if (!obligation.is_active || obligation.next_due_date > windowEnd) continue
    reminders.push({
      id: `recurring:${obligation.id}:${obligation.next_due_date}`, kind: 'recurring', name: obligation.name,
      sourceId: obligation.id, dueDate: obligation.next_due_date,
      status: classifyDueDate(obligation.next_due_date, today, false),
      amount: obligation.expected_amount, currency: obligation.currency,
      paymentAccountId: obligation.payment_account_id,
    })
  }
  for (const account of accounts) {
    if (!account.is_active || account.type !== 'credit_card' || !account.payment_due_day) continue
    for (const dueDate of monthlyDueDatesInWindow(today, account.payment_due_day)) {
      if (dueDate > windowEnd) continue
      reminders.push({
        id: `card:${account.id}:${dueDate}`, kind: 'card', name: account.name, sourceId: account.id,
        dueDate, status: classifyDueDate(dueDate, today, false), amount: null, currency: null,
        paymentAccountId: account.id,
      })
    }
  }
  return reminders.toSorted((a, b) => {
    const statusOrder = { overdue: 0, upcoming: 1, paid: 2 }
    return statusOrder[a.status] - statusOrder[b.status] || (a.dueDate ?? '').localeCompare(b.dueDate ?? '')
  })
}

export type RecentTransactionItem = {
  id: string
  date: string
  description: string
  amount_crc: number
  currency: CurrencyCode
  amount: number
  categoryName: string | null
  categoryColor: string | null
  categoryType: CategoryType | null
}

export type DashboardInsights = {
  mom: {
    income: MomChange
    expenses: MomChange
    savings: MomChange
    balance: MomChange
  }
  rates: FinancialRates
  cashFlow: CashFlowBreakdown | null
  pace: MonthPace
  exchangeRate: { usd_to_crc: number; date: string } | null
  totalSavingsCRC: number
  totalDebtPendingCRC: number
  activeDebtsMonthlyCRC: number
}

const VALID_CATEGORY_TYPES = ['income', 'fixed_expense', 'variable_expense', 'savings'] as const

function isValidCategoryType(value: unknown): value is CategoryType {
  return typeof value === 'string' && (VALID_CATEGORY_TYPES as readonly string[]).includes(value)
}

// --- Pure helpers (unit tested) ---

export function computeTotals(transactions: TransactionForSummary[]): MonthTotals {
  const ledger = computeLedgerTotals(transactions)
  return {
    income: ledger.income,
    expenses: ledger.expenses,
    savings: ledger.savings,
    balance: ledger.balance,
    reimbursements: ledger.reimbursements,
    netExpenses: ledger.netExpenses,
  }
}

export function monthTotalsFromLedger(ledger: LedgerTotals): MonthTotals {
  return {
    income: ledger.income,
    expenses: ledger.expenses,
    savings: ledger.savings,
    balance: ledger.balance,
    reimbursements: ledger.reimbursements,
    netExpenses: ledger.netExpenses,
  }
}

export function computeExpenseSplit(transactions: TransactionForSummary[]): {
  fixedExpenses: number
  variableExpenses: number
} {
  const fixedExpenses = roundMoney(
    transactions
      .filter(t => t.category_type === 'fixed_expense')
      .reduce((sum, t) => sum + t.amount_crc, 0),
  )
  const variableExpenses = roundMoney(
    transactions
      .filter(t => t.category_type === 'variable_expense')
      .reduce((sum, t) => sum + t.amount_crc, 0),
  )
  return { fixedExpenses, variableExpenses }
}

export function computeMomChange(current: number, previous: number): MomChange {
  const delta = roundMoney(current - previous)
  const percent = previous === 0
    ? (current === 0 ? 0 : null)
    : roundMoney(((current - previous) / Math.abs(previous)) * 100)
  return { current, previous, delta, percent }
}

export function computeFinancialRates(
  totals: MonthTotals,
  fixedExpenses: number,
  variableExpenses: number,
): FinancialRates {
  const savingsRate = totals.income > 0
    ? roundMoney((totals.savings / totals.income) * 100)
    : null
  const expenseRate = totals.income > 0
    ? roundMoney((totals.expenses / totals.income) * 100)
    : null
  const expenseTotal = fixedExpenses + variableExpenses
  const fixedShare = expenseTotal > 0
    ? roundMoney((fixedExpenses / expenseTotal) * 100)
    : null
  const variableShare = expenseTotal > 0
    ? roundMoney((variableExpenses / expenseTotal) * 100)
    : null
  return { savingsRate, expenseRate, fixedShare, variableShare }
}

export function computeMonthPace(
  expensesCRC: number,
  dayOfMonth: number,
  daysInMonth: number,
): MonthPace {
  const safeDay = Math.min(Math.max(dayOfMonth, 1), daysInMonth)
  const elapsedPercent = roundMoney((safeDay / daysInMonth) * 100)
  const dailyBurn = roundMoney(expensesCRC / safeDay)
  const projectedExpenses = safeDay > 0
    ? roundMoney(dailyBurn * daysInMonth)
    : null
  return {
    dayOfMonth: safeDay,
    daysInMonth,
    elapsedPercent,
    projectedExpenses,
    dailyBurn,
  }
}

export function getBalanceFromRow(row: { income: number; expenses: number; savings: number }): number {
  return roundMoney(row.income - row.expenses - row.savings)
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

  const [{ data: txData, error: txError }, { data: catData, error: catError }, { data: rateData, error: rateError }] = await Promise.all([
    supabase
      .from('transactions')
      .select('amount_crc, category_id, transaction_type, category:categories(type)')
      .gte('date', dateFrom)
      .lte('date', dateTo),
    supabase
      .from('categories')
      .select('id, name, color, type, monthly_budget_amount, monthly_budget_currency')
      .eq('is_active', true)
      .in('type', ['fixed_expense', 'variable_expense'])
      .not('monthly_budget_amount', 'is', null),
    supabase
      .from('exchange_rates')
      .select('usd_to_crc')
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (txError || catError || rateError) throw new Error('No se pudo cargar el resumen financiero.')

  type TxWithCategory = {
    amount_crc: number
    category_id: string | null
    transaction_type: string | null
    category: { type: string } | null
  }
  const typedTxData = (txData ?? []) as unknown as TxWithCategory[]

  const transactions = typedTxData.map(t => ({
    amount_crc: t.amount_crc,
    category_type: (() => {
      const rawType = t.category?.type
      return isValidCategoryType(rawType) ? rawType : 'variable_expense'
    })(),
    transaction_type: t.transaction_type as TransactionType | null,
  }))

  const totals = computeTotals(transactions)

  const spentByCategory = new Map<string, number>()
  for (const t of typedTxData) {
    if (t.category_id) {
      spentByCategory.set(
        t.category_id,
        (spentByCategory.get(t.category_id) ?? 0) + t.amount_crc
      )
    }
  }

  const hasUsdBudgets = (catData ?? []).some(cat => cat.monthly_budget_currency === 'USD')
  if (hasUsdBudgets && rateData === null) {
    throw new Error('Exchange rate required for USD budget categories but none found')
  }
  const usdToCRC = rateData?.usd_to_crc ?? 1  // safe: either no USD budgets, or rate is present

  const budgetProgress: BudgetProgressItem[] = (catData ?? [])
    .map(cat => {
      const spentCRC = spentByCategory.get(cat.id) ?? 0
      const multiplier = cat.monthly_budget_currency === 'USD' ? usdToCRC : 1
      // monthly_budget_amount is non-null because the query filters .not('monthly_budget_amount', 'is', null)
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

  const { fixedExpenses, variableExpenses } = computeExpenseSplit(transactions)

  return {
    totals,
    budgetProgress,
    fixedExpenses,
    variableExpenses,
    transactionCount: typedTxData.length,
  }
}

export function computeAvailableBalance(
  monthlyIncomeCRC: number,
  expensesCRC: number,
  savingsContribsCRC: number,
  activeDebtsCRC: number
): number {
  return roundMoney(monthlyIncomeCRC - expensesCRC - savingsContribsCRC - activeDebtsCRC)
}

export async function getCashFlowBreakdown(
  supabase: SupabaseClient<Database>,
  year: number,
  month: number,
): Promise<CashFlowBreakdown> {
  const monthStr = String(month).padStart(2, '0')
  const lastDay = new Date(year, month, 0).getDate()
  const dateFrom = `${year}-${monthStr}-01`
  const dateTo = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Costa_Rica' }).format(new Date())

  const [
    { data: incomeRows, error: incomeError },
    { data: txRows, error: txError },
    { data: debts, error: debtsError },
    { data: obligations, error: obligationsError },
    { data: funds, error: fundsError },
    { data: rateData, error: rateError },
  ] = await Promise.all([
    supabase
      .from('income_config')
      .select('first_payment_amount, second_payment_amount, currency')
      .lte('effective_from', todayStr)
      .order('effective_from', { ascending: false })
      .limit(1),
    supabase
      .from('transactions')
      .select('amount_crc, debt_id, recurring_obligation_id, scheduled_due_date, transaction_type, category:categories(type)')
      .gte('date', dateFrom)
      .lte('date', dateTo),
    supabase
      .from('debts')
      .select('id, monthly_amount_crc, is_active, next_due_date')
      .eq('is_active', true),
    supabase
      .from('recurring_obligations')
      .select('id, expected_amount_crc, is_active, next_due_date')
      .eq('is_active', true),
    supabase
      .from('savings_funds')
      .select('id, monthly_contribution_amount, monthly_contribution_currency, is_active')
      .eq('is_active', true),
    supabase
      .from('exchange_rates')
      .select('usd_to_crc')
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (incomeError || txError || debtsError || obligationsError || fundsError || rateError) {
    throw new Error('No se pudo cargar el flujo financiero.')
  }

  type TxRow = {
    amount_crc: number
    debt_id: string | null
    recurring_obligation_id: string | null
    scheduled_due_date: string | null
    transaction_type: string | null
    category: { type: string } | null
  }
  const typedTx = (txRows ?? []) as unknown as TxRow[]

  const ledgerTx = typedTx.map(t => ({
    amount_crc: t.amount_crc,
    category_type: (isValidCategoryType(t.category?.type) ? t.category!.type : 'variable_expense') as CategoryType,
    transaction_type: t.transaction_type as TransactionType | null,
    debt_id: t.debt_id,
  }))

  const ledger = computeLedgerTotals(ledgerTx)

  const reservations = computeMonthlyUnpaidCommitments(
    debts ?? [],
    obligations ?? [],
    typedTx,
    year,
    month,
  )
  const { unpaidDebtsMonthlyCRC, unpaidRecurringMonthlyCRC } = reservations

  const usdToCRC = rateData?.usd_to_crc ?? 0
  const pendingPlannedContributionsCRC = roundMoney(
    (funds ?? []).reduce((sum, f) => {
      if (!f.monthly_contribution_amount) return sum
      if (f.monthly_contribution_currency === 'USD') {
        return sum + (usdToCRC > 0 ? f.monthly_contribution_amount * usdToCRC : 0)
      }
      return sum + f.monthly_contribution_amount
    }, 0),
  )
  // If there are already savings txs this month, treat planned as residual only when savings < planned
  const pendingPlanned = ledger.savings >= pendingPlannedContributionsCRC
    ? 0
    : roundMoney(pendingPlannedContributionsCRC - ledger.savings)

  const incomeConfig = incomeRows?.[0] ?? null
  const salaryIncomeCRC = incomeConfig
    ? computeMonthlyIncomeCRC(incomeConfig, rateData?.usd_to_crc)
    : null

  const projected = computeProjectedCashFlow({
    ledger,
    salaryIncomeCRC,
    unpaidDebtsMonthlyCRC,
    unpaidRecurringMonthlyCRC,
    pendingPlannedContributionsCRC: pendingPlanned,
  })

  return {
    ledgerIncomeCRC: ledger.income,
    salaryIncomeCRC,
    expensesCRC: ledger.expenses,
    netExpensesCRC: ledger.netExpenses,
    reimbursementsCRC: ledger.reimbursements,
    savingsCRC: ledger.savings,
    unpaidDebtsMonthlyCRC,
    unpaidRecurringMonthlyCRC,
    pendingPlannedContributionsCRC: pendingPlanned,
    availableCRC: projected.ledgerBalance,
    projectedAvailableCRC: projected.projectedAvailable,
    usedSalaryFallback: projected.usedSalaryFallback,
  }
}

export async function getAvailableBalance(
  supabase: SupabaseClient<Database>,
  year: number,
  month: number,
): Promise<number | null> {
  const breakdown = await getCashFlowBreakdown(supabase, year, month)
  return breakdown.availableCRC
}

export async function getRecentTransactions(
  supabase: SupabaseClient<Database>,
  limit = 8,
): Promise<RecentTransactionItem[]> {
  const { data } = await supabase
    .from('transactions')
    .select(`
      id, date, description, amount, currency, amount_crc,
      category:categories(name, color, type)
    `)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  type Row = {
    id: string
    date: string
    description: string
    amount: number
    currency: CurrencyCode
    amount_crc: number
    category: { name: string; color: string; type: string } | null
  }

  return ((data ?? []) as unknown as Row[]).map(t => ({
    id: t.id,
    date: t.date,
    description: t.description,
    amount: t.amount,
    currency: t.currency,
    amount_crc: t.amount_crc,
    categoryName: t.category?.name ?? null,
    categoryColor: t.category?.color ?? null,
    categoryType: isValidCategoryType(t.category?.type) ? t.category!.type : null,
  }))
}

export function buildDashboardInsights(params: {
  totals: MonthTotals
  previousTotals: MonthTotals | null
  fixedExpenses: number
  variableExpenses: number
  cashFlow: CashFlowBreakdown | null
  dayOfMonth: number
  daysInMonth: number
  exchangeRate: { usd_to_crc: number; date: string } | null
  totalSavingsCRC: number
  totalDebtPendingCRC: number
  activeDebtsMonthlyCRC: number
}): DashboardInsights {
  const prev = params.previousTotals ?? { income: 0, expenses: 0, savings: 0, balance: 0 }
  const currentBalance = params.totals.balance
  const previousBalance = prev.balance

  return {
    mom: {
      income: computeMomChange(params.totals.income, prev.income),
      expenses: computeMomChange(params.totals.expenses, prev.expenses),
      savings: computeMomChange(params.totals.savings, prev.savings),
      balance: computeMomChange(currentBalance, previousBalance),
    },
    rates: computeFinancialRates(params.totals, params.fixedExpenses, params.variableExpenses),
    cashFlow: params.cashFlow,
    pace: computeMonthPace(params.totals.expenses, params.dayOfMonth, params.daysInMonth),
    exchangeRate: params.exchangeRate,
    totalSavingsCRC: params.totalSavingsCRC,
    totalDebtPendingCRC: params.totalDebtPendingCRC,
    activeDebtsMonthlyCRC: params.activeDebtsMonthlyCRC,
  }
}

export async function getMonthlyHistory(
  supabase: SupabaseClient<Database>,
  months: number = 6
): Promise<MonthlyTotalsRow[]> {
  // Calculate date range: last `months` months from today (Costa Rica timezone)
  // dateFrom = first day of (current month - (months-1))
  // dateTo = last day of current month
  const { year, month } = getCurrentMonthCR()

  // Calculate start month
  const startDate = new Date(year, month - 1 - (months - 1), 1)
  const startYear = startDate.getFullYear()
  const startMonth = startDate.getMonth() + 1
  const dateFrom = `${startYear}-${String(startMonth).padStart(2, '0')}-01`

  const lastDay = new Date(year, month, 0).getDate()
  const dateTo = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const { data } = await supabase
    .from('transactions')
    .select('amount_crc, date, category:categories(type)')
    .gte('date', dateFrom)
    .lte('date', dateTo)

  type HistoryTx = { amount_crc: number; date: string; category: { type: string } | null }
  const transactions = ((data ?? []) as unknown as HistoryTx[]).map(t => {
    const rawType = t.category?.type
    const category_type: CategoryType = isValidCategoryType(rawType) ? rawType : 'variable_expense'
    const month = t.date.substring(0, 7)
    return { amount_crc: t.amount_crc, category_type, month }
  })

  return buildMonthlyTotals(transactions)
}

export async function getMonthlyExpensesByCategory(
  supabase: SupabaseClient<Database>,
  year: number,
  month: number
): Promise<CategoryExpense[]> {
  const monthStr = String(month).padStart(2, '0')
  const lastDay = new Date(year, month, 0).getDate()
  const dateFrom = `${year}-${monthStr}-01`
  const dateTo = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`

  const { data, error } = await supabase
    .from('transactions')
    .select('amount_crc, category_id, category:categories(type, name, color)')
    .gte('date', dateFrom)
    .lte('date', dateTo)

  if (error) throw new Error('No se pudo cargar el gasto por categoría.')

  type ExpenseByCatTx = {
    amount_crc: number
    category_id: string | null
    category: { type: string; name: string; color: string } | null
  }
  const transactions = ((data ?? []) as unknown as ExpenseByCatTx[]).map(t => {
    const cat = t.category
    const rawType = cat?.type
    const category_type: CategoryType = isValidCategoryType(rawType) ? rawType : 'variable_expense'
    return {
      amount_crc: t.amount_crc,
      category_type,
      categoryId: t.category_id ?? '',
      categoryName: cat?.name ?? 'Sin categoría',
      categoryColor: cat?.color ?? '#888888',
    }
  })

  return groupExpensesByCategory(transactions)
}
