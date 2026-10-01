import { merchantKey } from '@/lib/merchant-key'

type EditedTransaction = {
  source: string | null
  description: string
  category_id: string
}

/**
 * Si el usuario corrige la categoría de una transacción creada desde el correo,
 * devuelve la regla comercio → categoría que hay que guardar; si no, null.
 */
export function ruleToLearn(
  existing: EditedTransaction,
  newCategoryId: string,
): { merchant_key: string; category_id: string } | null {
  if (existing.source !== 'email') return null
  if (existing.category_id === newCategoryId) return null

  const key = merchantKey(existing.description)
  if (!key) return null

  return { merchant_key: key, category_id: newCategoryId }
}
