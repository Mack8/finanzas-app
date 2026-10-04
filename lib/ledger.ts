import type { CategoryType, TransactionType } from '@/types/database'
import { roundMoney } from '@/lib/transactions'

export type LedgerTransaction = {
  amount_crc: number
  category_type: CategoryType
  transaction_type?: TransactionType | null
  debt_id?: string | null
  date?: string
}

export type LedgerTotals = {
  income: number
  expenses: number
  reimbursements: number
  netExpenses: number
  savings: number
  balance: number
}

export function computeLedgerTotals(transactions: LedgerTransaction[]): LedgerTotals {
  let income = 0
  let expenses = 0
  let savings = 0
  let reimbursements = 0

  for (const t of transactions) {
    if (t.category_type === 'income') {
      income += t.amount_crc
      continue
    }
    if (t.category_type === 'savings') {
      savings += t.amount_crc
      continue
    }
    if (t.category_type === 'fixed_expense' || t.category_type === 'variable_expense') {
      expenses += t.amount_crc
      if (t.transaction_type === 'reimbursement') {
        reimbursements += t.amount_crc
      }
    }
  }

  income = roundMoney(income)
  expenses = roundMoney(expenses)
  savings = roundMoney(savings)
  reimbursements = roundMoney(reimbursements)

  return {
    income,
    expenses,
    reimbursements,
    netExpenses: roundMoney(expenses - reimbursements),
    savings,
    balance: roundMoney(income - expenses - savings),
  }
}

/** Available balance from the ledger only (single source of truth). */
export function computeLedgerAvailable(totals: LedgerTotals): number {
  return totals.balance
}

export type ProjectedCashFlowInput = {
  ledger: LedgerTotals
  /** Configured salary in CRC; null if not set */
  salaryIncomeCRC: number | null
  /** Active debts monthly CRC that do NOT yet have a linked payment tx this month */
  unpaidDebtsMonthlyCRC: number
  /** Active recurring obligations due in this month and not yet paid */
  unpaidRecurringMonthlyCRC: number
  /** Planned fund contributions not yet made this month */
  pendingPlannedContributionsCRC: number
}

export type ProjectedCashFlow = {
  /** Ledger balance */
  ledgerBalance: number
  /** Uses salary when no income txs yet; otherwise ledger income */
  effectiveIncome: number
  projectedAvailable: number
  usedSalaryFallback: boolean
}

export function computeProjectedCashFlow(input: ProjectedCashFlowInput): ProjectedCashFlow {
  const ledgerBalance = input.ledger.balance
  const usedSalaryFallback =
    input.ledger.income <= 0 && input.salaryIncomeCRC !== null && input.salaryIncomeCRC > 0

  const effectiveIncome = usedSalaryFallback
    ? input.salaryIncomeCRC!
    : input.ledger.income

  const projectedAvailable = roundMoney(
    effectiveIncome
      - input.ledger.netExpenses
      - input.ledger.savings
      - input.unpaidDebtsMonthlyCRC
      - input.unpaidRecurringMonthlyCRC
      - input.pendingPlannedContributionsCRC,
  )

  return {
    ledgerBalance,
    effectiveIncome,
    projectedAvailable,
    usedSalaryFallback,
  }
}

export function monthKeyFromDate(date: string): string {
  return date.slice(0, 7)
}
