export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type CurrencyCode = 'CRC' | 'USD'
export type CategoryType = 'fixed_expense' | 'variable_expense' | 'savings' | 'income'
export type TransactionType = 'personal' | 'household' | 'reimbursement'
export type AccountType = 'credit_card' | 'bank_account'

export interface Database {
  public: {
    Tables: {
      exchange_rates: {
        Row: {
          id: string
          date: string
          usd_to_crc: number
          source: string
          created_at: string
        }
        Insert: {
          id?: string
          date: string
          usd_to_crc: number
          source?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['exchange_rates']['Insert']>
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          user_id: string
          name: string
          type: CategoryType
          color: string
          icon: string | null
          monthly_budget_amount: number | null
          monthly_budget_currency: CurrencyCode
          is_active: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: CategoryType
          color?: string
          icon?: string | null
          monthly_budget_amount?: number | null
          monthly_budget_currency?: CurrencyCode
          is_active?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['categories']['Insert']>
        Relationships: []
      }
      payment_accounts: {
        Row: {
          id: string
          user_id: string
          name: string
          type: AccountType
          last_four: string | null
          bank_name: string | null
          closing_day: number | null
          payment_due_day: number | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: AccountType
          last_four?: string | null
          bank_name?: string | null
          closing_day?: number | null
          payment_due_day?: number | null
          is_active?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['payment_accounts']['Insert']>
        Relationships: []
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          date: string
          description: string
          amount: number
          currency: CurrencyCode
          amount_crc: number
          exchange_rate_id: string | null
          category_id: string
          payment_account_id: string | null
          transaction_type: TransactionType
          tags: string[]
          notes: string | null
          debt_id: string | null
          savings_contribution_id: string | null
          source: string | null
          external_ref: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          description: string
          amount: number
          currency?: CurrencyCode
          amount_crc: number
          exchange_rate_id?: string | null
          category_id: string
          payment_account_id?: string | null
          transaction_type?: TransactionType
          tags?: string[]
          notes?: string | null
          debt_id?: string | null
          savings_contribution_id?: string | null
          source?: string | null
          external_ref?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['transactions']['Insert']>
        Relationships: []
      }
      savings_funds: {
        Row: {
          id: string
          user_id: string
          name: string
          goal_amount: number
          goal_currency: CurrencyCode
          goal_amount_crc: number
          current_amount_crc: number
          target_date: string
          monthly_contribution_amount: number | null
          monthly_contribution_currency: CurrencyCode | null
          color: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          goal_amount: number
          goal_currency?: CurrencyCode
          goal_amount_crc: number
          current_amount_crc?: number
          target_date: string
          monthly_contribution_amount?: number | null
          monthly_contribution_currency?: CurrencyCode | null
          color?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['savings_funds']['Insert']>
        Relationships: []
      }
      savings_contributions: {
        Row: {
          id: string
          fund_id: string
          user_id: string
          date: string
          amount: number
          currency: CurrencyCode
          amount_crc: number
          exchange_rate_id: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          fund_id: string
          user_id: string
          date: string
          amount: number
          currency?: CurrencyCode
          amount_crc: number
          exchange_rate_id?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['savings_contributions']['Insert']>
        Relationships: []
      }
      debts: {
        Row: {
          id: string
          user_id: string
          name: string
          monthly_amount: number
          currency: CurrencyCode
          monthly_amount_crc: number
          total_installments: number
          paid_installments: number
          start_date: string
          payment_account_id: string | null
          notes: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          monthly_amount: number
          currency?: CurrencyCode
          monthly_amount_crc: number
          total_installments: number
          paid_installments?: number
          start_date: string
          payment_account_id?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['debts']['Insert']>
        Relationships: []
      }
      income_config: {
        Row: {
          id: string
          user_id: string
          first_payment_amount: number
          first_payment_day: number
          second_payment_amount: number | null
          second_payment_day: number | null
          currency: CurrencyCode
          effective_from: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          first_payment_amount: number
          first_payment_day: number
          second_payment_amount?: number | null
          second_payment_day?: number | null
          currency?: CurrencyCode
          effective_from: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['income_config']['Insert']>
        Relationships: []
      }
      merchant_rules: {
        Row: {
          id: string
          user_id: string
          merchant_key: string
          category_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          merchant_key: string
          category_id: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['merchant_rules']['Insert']>
        Relationships: []
      }
      email_ingest_log: {
        Row: {
          id: string
          user_id: string
          message_id: string
          bank: string | null
          status: 'created' | 'duplicate' | 'unparsed' | 'error'
          subject: string | null
          detail: string | null
          transaction_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          message_id: string
          bank?: string | null
          status: 'created' | 'duplicate' | 'unparsed' | 'error'
          subject?: string | null
          detail?: string | null
          transaction_id?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['email_ingest_log']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      apply_savings_contribution: {
        Args: {
          p_fund_id: string
          p_user_id: string
          p_date: string
          p_amount: number
          p_currency: string
          p_amount_crc: number
          p_exchange_rate_id: string | null
          p_notes: string | null
        }
        Returns: Database['public']['Tables']['savings_contributions']['Row']
      }
      revert_savings_contribution: {
        Args: {
          p_contribution_id: string
          p_user_id: string
        }
        Returns: undefined
      }
    }
  }
}
