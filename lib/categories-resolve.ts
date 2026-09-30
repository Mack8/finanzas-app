import type { SupabaseClient } from '@supabase/supabase-js'
import type { CategoryType, Database } from '@/types/database'

type CategoryRow = {
  id: string
  name: string
  type: CategoryType
}

/**
 * Resolve a category for system-generated ledger entries (debt pay / savings).
 * Prefers name match, then first active of the given type.
 */
export async function resolveCategoryForType(
  supabase: SupabaseClient<Database>,
  userId: string,
  type: CategoryType,
  preferredNameIncludes?: string[],
): Promise<CategoryRow | null> {
  const { data } = await supabase
    .from('categories')
    .select('id, name, type')
    .eq('user_id', userId)
    .eq('type', type)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  const rows = (data ?? []) as CategoryRow[]
  if (rows.length === 0) return null

  if (preferredNameIncludes?.length) {
    const lower = preferredNameIncludes.map(s => s.toLowerCase())
    const match = rows.find(r => lower.some(p => r.name.toLowerCase().includes(p)))
    if (match) return match
  }

  return rows[0] ?? null
}

export async function assertPaymentAccountOwnership(
  supabase: SupabaseClient<Database>,
  userId: string,
  paymentAccountId: string | null | undefined,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!paymentAccountId) return { ok: true }

  const { data } = await supabase
    .from('payment_accounts')
    .select('id')
    .eq('id', paymentAccountId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()

  if (!data) {
    return { ok: false, message: 'La cuenta de pago seleccionada no es válida.' }
  }
  return { ok: true }
}
