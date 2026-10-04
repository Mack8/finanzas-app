import type { SavingsFund, SavingsFundWithProgress } from '@/types/domain'
import { roundMoney } from '@/lib/transactions'

export function computeMonthsToGoal(remainingCRC: number, monthlyContributionCRC: number): number | null {
  if (monthlyContributionCRC <= 0) return null
  if (remainingCRC <= 0) return 0
  return Math.ceil(remainingCRC / monthlyContributionCRC)
}

export function computeSavingsProgress(
  fund: SavingsFund,
  usdToCRC?: number
): SavingsFundWithProgress {
  const progressPercent = fund.goal_amount_crc > 0
    ? roundMoney((fund.current_amount_crc / fund.goal_amount_crc) * 100)
    : 0

  let monthsToGoal: number | null = null

  if (fund.monthly_contribution_amount !== null && fund.monthly_contribution_currency !== null) {
    const monthlyCRC = fund.monthly_contribution_currency === 'USD'
      ? (usdToCRC ? roundMoney(fund.monthly_contribution_amount * usdToCRC) : null)
      : fund.monthly_contribution_amount

    if (monthlyCRC !== null) {
      monthsToGoal = computeMonthsToGoal(
        fund.goal_amount_crc - fund.current_amount_crc,
        monthlyCRC
      )
    }
  }

  return { ...fund, progressPercent, monthsToGoal }
}

export type SavingsPace = 'on-track' | 'slightly-behind' | 'behind' | 'completed'

export function getSavingsPace(fund: SavingsFund, asOf = new Date()): SavingsPace {
  const progress = fund.goal_amount_crc > 0
    ? Math.min(Math.max((fund.current_amount_crc / fund.goal_amount_crc) * 100, 0), 100)
    : 0

  if (!fund.is_active || progress >= 100) return 'completed'

  const start = Date.parse(fund.created_at)
  const target = Date.parse(`${fund.target_date}T23:59:59.999Z`)
  if (!Number.isFinite(start) || !Number.isFinite(target) || target <= start) return 'on-track'
  if (asOf.getTime() > target) return 'behind'

  const elapsedPercent = Math.min(Math.max(((asOf.getTime() - start) / (target - start)) * 100, 0), 100)
  const gap = elapsedPercent - progress
  if (gap <= 10) return 'on-track'
  if (gap <= 25) return 'slightly-behind'
  return 'behind'
}
