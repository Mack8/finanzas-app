import type { Debt, DebtWithProjection } from '@/types/domain'
import { roundMoney } from '@/lib/transactions'

// Adds N calendar months to a YYYY-MM-DD string using UTC to avoid timezone shifts
function addMonths(dateStr: string, months: number): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1 + months, day))
    .toISOString()
    .slice(0, 10)
}

export type DebtsSummary = {
  totalMonthlyCRC: number
  totalPendingCRC: number
  activeCount: number
}

export function computeDebtProjection(debt: Debt): DebtWithProjection {
  const remainingInstallments = debt.total_installments - debt.paid_installments
  const releaseDate = addMonths(debt.start_date, debt.total_installments)
  const totalPending = roundMoney(remainingInstallments * debt.monthly_amount_crc)
  return { ...debt, remainingInstallments, releaseDate, totalPending }
}

export function computeDebtsSummary(projections: DebtWithProjection[]): DebtsSummary {
  const active = projections.filter(d => d.is_active)
  return {
    totalMonthlyCRC: roundMoney(active.reduce((sum, d) => sum + d.monthly_amount_crc, 0)),
    totalPendingCRC: roundMoney(projections.reduce((sum, d) => sum + d.totalPending, 0)),
    activeCount: active.length,
  }
}
