import { describe, it, expect } from 'vitest'
import { computeDebtProjection, computeDebtsSummary } from './debts'
import type { Debt } from '@/types/domain'

const baseDebt: Debt = {
  id: 'debt-1',
  user_id: 'user-1',
  name: 'Leasing',
  monthly_amount: 192,
  currency: 'USD',
  monthly_amount_crc: 100000,
  total_installments: 25,
  paid_installments: 5,
  start_date: '2024-01-15',
  payment_account_id: null,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
}

describe('computeDebtProjection', () => {
  it('calculates remaining installments correctly', () => {
    const result = computeDebtProjection(baseDebt)
    expect(result.remainingInstallments).toBe(20)
  })

  it('calculates release date by adding total_installments months to start_date', () => {
    const result = computeDebtProjection(baseDebt)
    // 2024-01-15 + 25 months = 2026-02-15
    expect(result.releaseDate).toBe('2026-02-15')
  })

  it('calculates total pending as remainingInstallments * monthly_amount_crc', () => {
    const result = computeDebtProjection(baseDebt)
    expect(result.totalPending).toBe(20 * 100000)
  })

  it('returns 0 remaining and same releaseDate when fully paid', () => {
    const paid = { ...baseDebt, paid_installments: 25, is_active: false }
    const result = computeDebtProjection(paid)
    expect(result.remainingInstallments).toBe(0)
    expect(result.totalPending).toBe(0)
    expect(result.releaseDate).toBe('2026-02-15')
  })

  it('handles month overflow correctly — result is a valid YYYY-MM-DD', () => {
    const debt = { ...baseDebt, start_date: '2024-01-31', total_installments: 1 }
    const result = computeDebtProjection(debt)
    expect(result.releaseDate).toBeTruthy()
    expect(result.releaseDate.length).toBe(10)
  })
})

describe('computeDebtsSummary', () => {
  it('sums monthly CRC only for active debts', () => {
    const inactive = { ...baseDebt, id: 'd2', is_active: false, monthly_amount_crc: 50000 }
    const p1 = computeDebtProjection(baseDebt)
    const p2 = computeDebtProjection(inactive)
    const summary = computeDebtsSummary([p1, p2])
    expect(summary.totalMonthlyCRC).toBe(100000)
    expect(summary.activeCount).toBe(1)
  })

  it('sums totalPending across all debts', () => {
    const debt2 = { ...baseDebt, id: 'd2', monthly_amount_crc: 50000, paid_installments: 10 }
    const p1 = computeDebtProjection(baseDebt)
    const p2 = computeDebtProjection(debt2)
    const summary = computeDebtsSummary([p1, p2])
    expect(summary.totalPendingCRC).toBe(20 * 100000 + 15 * 50000)
  })

  it('returns zeros for empty list', () => {
    const summary = computeDebtsSummary([])
    expect(summary.totalMonthlyCRC).toBe(0)
    expect(summary.totalPendingCRC).toBe(0)
    expect(summary.activeCount).toBe(0)
  })
})
