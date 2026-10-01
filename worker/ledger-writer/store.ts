import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { Bank } from '../types'

export type NewLedgerRow = Database['public']['Tables']['transactions']['Insert']

export type InsertResult = { status: 'inserted'; id: string } | { status: 'duplicate' }

export interface LedgerStore {
  /** Cuenta activa del usuario para ese banco y esos 4 dígitos; null si no hay una única coincidencia. */
  findPaymentAccountId(bank: Bank, last4: string): Promise<string | null>
  insertTransaction(row: NewLedgerRow): Promise<InsertResult>
}

const BANK_NAME_PATTERN: Record<Bank, string> = {
  bac: '%bac%',
  promerica: '%promerica%',
  davibank: '%davi%',
}

export function supabaseLedgerStore(supabase: SupabaseClient<Database>, userId: string): LedgerStore {
  return {
    async findPaymentAccountId(bank, last4) {
      const { data, error } = await supabase
        .from('payment_accounts')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .eq('last_four', last4)
        .ilike('bank_name', BANK_NAME_PATTERN[bank])
        .limit(2)
      if (error) throw new Error(`No se pudo buscar la cuenta de pago: ${error.message}`)
      return data && data.length === 1 ? data[0].id : null
    },

    async insertTransaction(row) {
      const { data, error } = await supabase.from('transactions').insert(row).select('id').single()
      if (error) {
        // 23505 = unique_violation sobre (user_id, external_ref): la compra ya existe.
        if (error.code === '23505') return { status: 'duplicate' }
        throw new Error(`No se pudo insertar la transacción: ${error.message}`)
      }
      return { status: 'inserted', id: data.id }
    },
  }
}
