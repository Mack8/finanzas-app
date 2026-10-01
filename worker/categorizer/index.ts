import { merchantKey } from '@/lib/merchant-key'
import type { CategoryStore } from './store'

export type ModelAnswer = { category: string; confidence: number }

export type Ask = (input: {
  merchant: string
  hint: string | null
  categories: string[]
}) => Promise<ModelAnswer | null>

export type Categorization = {
  categoryId: string
  source: 'rule' | 'model' | 'fallback'
  categoryName?: string
}

export type CategorizerDeps = {
  store: CategoryStore
  ask: Ask
  minConfidence?: number
}

export async function categorize(
  merchant: string,
  hint: string | null,
  deps: CategorizerDeps,
): Promise<Categorization> {
  const minConfidence = deps.minConfidence ?? 0.6

  const ruleCategoryId = await deps.store.findRule(merchantKey(merchant))
  if (ruleCategoryId) return { categoryId: ruleCategoryId, source: 'rule' }

  const fallback = async (): Promise<Categorization> => ({
    categoryId: await deps.store.fallbackCategoryId(),
    source: 'fallback',
  })

  const categories = await deps.store.listExpenseCategories()
  if (categories.length === 0) return fallback()

  let answer: ModelAnswer | null
  try {
    answer = await deps.ask({ merchant, hint, categories: categories.map(c => c.name) })
  } catch {
    answer = null
  }
  if (!answer || answer.confidence < minConfidence) return fallback()

  const wanted = answer.category.trim().toLowerCase()
  const match = categories.find(c => c.name.trim().toLowerCase() === wanted)
  if (!match) return fallback()

  return { categoryId: match.id, source: 'model', categoryName: match.name }
}
