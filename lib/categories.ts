import type { CategoryType } from '@/types/database'

export const categoryTypeLabels: Record<CategoryType, string> = {
  income: 'Ingreso',
  fixed_expense: 'Gasto fijo',
  variable_expense: 'Gasto variable',
  savings: 'Ahorro',
}

const baseSortOrderByType: Record<CategoryType, number> = {
  income: 0,
  fixed_expense: 10,
  variable_expense: 20,
  savings: 30,
}

export function getNextCategorySortOrder(
  type: CategoryType,
  currentMaxSortOrder: number | null
) {
  if (currentMaxSortOrder === null) {
    return baseSortOrderByType[type]
  }

  return Math.max(baseSortOrderByType[type], currentMaxSortOrder + 1)
}
