import { roundMoney } from '@/lib/transactions'
import type { BudgetProgressItem } from '@/lib/dashboard'

export type BudgetAlertLevel = 'ok' | 'watch' | 'over'

export function budgetAlertLevel(usedPercent: number): BudgetAlertLevel {
  if (usedPercent >= 100) return 'over'
  if (usedPercent >= 80) return 'watch'
  return 'ok'
}

export function summarizeBudgets(items: BudgetProgressItem[]) {
  const totalBudget = roundMoney(items.reduce((s, i) => s + i.budgetCRC, 0))
  const totalSpent = roundMoney(items.reduce((s, i) => s + i.spentCRC, 0))
  const usedPercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
  const overCount = items.filter(i => i.usedPercent >= 100).length
  const watchCount = items.filter(i => i.usedPercent >= 80 && i.usedPercent < 100).length

  return {
    totalBudget,
    totalSpent,
    remaining: roundMoney(totalBudget - totalSpent),
    usedPercent,
    overCount,
    watchCount,
    level: budgetAlertLevel(usedPercent),
  }
}
