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
