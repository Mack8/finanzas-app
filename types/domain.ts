import type {
  CategoryType,
  CurrencyCode,
  TransactionType,
  AccountType,
  Database,
} from './database'

export type { CategoryType, CurrencyCode, TransactionType, AccountType }

// Row types — shortcuts para usar en componentes
export type ExchangeRate = Database['public']['Tables']['exchange_rates']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type PaymentAccount = Database['public']['Tables']['payment_accounts']['Row']
export type Transaction = Database['public']['Tables']['transactions']['Row']
export type SavingsFund = Database['public']['Tables']['savings_funds']['Row']
export type SavingsContribution = Database['public']['Tables']['savings_contributions']['Row']
export type Debt = Database['public']['Tables']['debts']['Row']
export type RecurringObligation = Database['public']['Tables']['recurring_obligations']['Row']
export type IncomeConfig = Database['public']['Tables']['income_config']['Row']

// Insert types
export type NewTransaction = Database['public']['Tables']['transactions']['Insert']
export type NewSavingsContribution = Database['public']['Tables']['savings_contributions']['Insert']
export type NewDebt = Database['public']['Tables']['debts']['Insert']
export type NewRecurringObligation = Database['public']['Tables']['recurring_obligations']['Insert']
export type NewSavingsFund = Database['public']['Tables']['savings_funds']['Insert']
export type NewCategory = Database['public']['Tables']['categories']['Insert']
export type NewPaymentAccount = Database['public']['Tables']['payment_accounts']['Insert']
export type NewIncomeConfig = Database['public']['Tables']['income_config']['Insert']

export type PaymentReminder = {
  id: string
  kind: 'debt' | 'recurring' | 'card'
  name: string
  dueDate: string
  status: 'overdue' | 'upcoming' | 'paid'
  amount: number | null
  currency: CurrencyCode | null
  paidOn?: string
  paymentAccountId?: string | null
  sourceId: string
}

// Computed types usados en la UI
export interface MonthSummary {
  year: number
  month: number        // 1-12
  totalIncome: number  // CRC
  totalExpenses: number // CRC
  totalSavings: number  // CRC
  availableBalance: number // CRC
}

export interface DebtWithProjection extends Debt {
  remainingInstallments: number
  releaseDate: string  // ISO date
  totalPending: number // CRC
}

export interface SavingsFundWithProgress extends SavingsFund {
  progressPercent: number  // 0-100
  monthsToGoal: number | null
}
