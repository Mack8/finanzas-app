import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export const FALLBACK_NAME = 'Sin categorizar'

export type CategoryOption = { id: string; name: string }

export interface CategoryStore {
  /** Categorías activas de gasto (fijo o variable), sin la de respaldo. */
  listExpenseCategories(): Promise<CategoryOption[]>
  /** category_id de la regla aprendida para ese comercio, o null. */
  findRule(merchantKey: string): Promise<string | null>
  /** id de "Sin categorizar"; la crea si no existe (salvo en dry-run). */
  fallbackCategoryId(): Promise<string>
}

export function supabaseCategoryStore(
  supabase: SupabaseClient<Database>,
  userId: string,
  opts: { createFallback: boolean },
): CategoryStore {
  let fallbackId: string | null = null

  return {
    async listExpenseCategories() {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .eq('user_id', userId)
        .eq('is_active', true)
        .in('type', ['fixed_expense', 'variable_expense'])
        .neq('name', FALLBACK_NAME)
        .order('sort_order', { ascending: true })
      if (error) throw new Error(`No se pudieron leer las categorías: ${error.message}`)
      return data ?? []
    },

    async findRule(key) {
      if (!key) return null
      const { data, error } = await supabase
        .from('merchant_rules')
        .select('category_id')
        .eq('user_id', userId)
        .eq('merchant_key', key)
        .maybeSingle()
      if (error) throw new Error(`No se pudo leer la regla del comercio: ${error.message}`)
      return data?.category_id ?? null
    },

    async fallbackCategoryId() {
      if (fallbackId) return fallbackId

      const { data: existing, error } = await supabase
        .from('categories')
        .select('id')
        .eq('user_id', userId)
        .eq('name', FALLBACK_NAME)
        .maybeSingle()
      if (error) throw new Error(`No se pudo leer la categoría de respaldo: ${error.message}`)
      if (existing) return (fallbackId = existing.id)

      if (!opts.createFallback) return 'dry-run-fallback'

      const { data: created, error: insertError } = await supabase
        .from('categories')
        .insert({ user_id: userId, name: FALLBACK_NAME, type: 'variable_expense', color: '#6b7280', sort_order: 99 })
        .select('id')
        .single()
      if (insertError) throw new Error(`No se pudo crear la categoría de respaldo: ${insertError.message}`)
      return (fallbackId = created.id)
    },
  }
}
