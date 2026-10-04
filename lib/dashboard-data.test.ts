import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { getDashboardSummary, getCashFlowBreakdown, getMonthlyExpensesByCategory } from './dashboard'

// Only the remote query is replaced: all calculation and error handling is real.
function failingClient(failedTable: string): SupabaseClient<Database> {
  return {
    from(table: string) {
      const result = table === failedTable
        ? { data: null, error: { message: 'database unavailable' } }
        : { data: table === 'exchange_rates' ? null : [], error: null }
      const query: Record<string, unknown> = {
        then: (resolve: (value: unknown) => void) => Promise.resolve(result).then(resolve),
      }
      for (const method of ['select', 'gte', 'lte', 'eq', 'in', 'not', 'order', 'limit', 'maybeSingle']) {
        query[method] = () => query
      }
      return query
    },
  } as unknown as SupabaseClient<Database>
}

describe('financial read failures', () => {
  it.each(['transactions', 'categories', 'exchange_rates'])('rejects a failed summary read from %s instead of showing an empty ledger', async table => {
    await expect(getDashboardSummary(failingClient(table), 2026, 10)).rejects.toThrow(/cargar/)
  })
  it.each(['transactions', 'income_config', 'debts', 'savings_funds', 'exchange_rates'])('rejects a failed cash-flow read from %s instead of inventing zero commitments', async table => {
    await expect(getCashFlowBreakdown(failingClient(table), 2026, 10)).rejects.toThrow(/cargar/)
  })
  it('rejects a failed category read instead of saying there is no spending', async () => {
    await expect(getMonthlyExpensesByCategory(failingClient('transactions'), 2026, 10)).rejects.toThrow(/cargar/)
  })
})
