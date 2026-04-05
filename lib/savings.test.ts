import { describe, it, expect } from 'vitest'
import { computeMonthsToGoal, computeSavingsProgress } from './savings'
import type { SavingsFund } from '@/types/domain'

const baseFund: SavingsFund = {
  id: 'fund-1',
  user_id: 'user-1',
  name: 'Emergencia',
  goal_amount: 2500000,
  goal_currency: 'CRC',
  goal_amount_crc: 2500000,
  current_amount_crc: 1250000,
  target_date: '2027-12-31',
  monthly_contribution_amount: 100000,
  monthly_contribution_currency: 'CRC',
  color: '#3b82f6',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
}

describe('computeMonthsToGoal', () => {
  it('returns 0 when remaining is 0 or negative', () => {
    expect(computeMonthsToGoal(0, 100000)).toBe(0)
    expect(computeMonthsToGoal(-50000, 100000)).toBe(0)
  })

  it('returns null when monthly contribution is 0 or negative', () => {
    expect(computeMonthsToGoal(500000, 0)).toBeNull()
    expect(computeMonthsToGoal(500000, -1)).toBeNull()
  })

  it('returns exact months when divisible', () => {
    expect(computeMonthsToGoal(500000, 100000)).toBe(5)
  })

  it('rounds up when not perfectly divisible', () => {
    expect(computeMonthsToGoal(550000, 100000)).toBe(6)
    expect(computeMonthsToGoal(1, 100000)).toBe(1)
  })
})

describe('computeSavingsProgress', () => {
  it('calculates 50% progress correctly', () => {
    const result = computeSavingsProgress(baseFund)
    expect(result.progressPercent).toBe(50)
  })

  it('calculates monthsToGoal from CRC monthly contribution', () => {
    const result = computeSavingsProgress(baseFund)
    // remaining = 1250000, monthly = 100000 → 13 months (ceil)
    expect(result.monthsToGoal).toBe(13)
  })

  it('returns 0 months when goal already reached', () => {
    const complete = { ...baseFund, current_amount_crc: 2500000 }
    const result = computeSavingsProgress(complete)
    expect(result.progressPercent).toBe(100)
    expect(result.monthsToGoal).toBe(0)
  })

  it('returns null monthsToGoal when no monthly contribution set', () => {
    const noContrib = { ...baseFund, monthly_contribution_amount: null, monthly_contribution_currency: null }
    const result = computeSavingsProgress(noContrib)
    expect(result.monthsToGoal).toBeNull()
  })

  it('calculates monthsToGoal for USD contribution when exchange rate provided', () => {
    const usdFund = {
      ...baseFund,
      monthly_contribution_amount: 200,
      monthly_contribution_currency: 'USD' as const,
    }
    // 200 USD × 500 = 100000 CRC/month; remaining = 1250000 → 13 months
    const result = computeSavingsProgress(usdFund, 500)
    expect(result.monthsToGoal).toBe(13)
  })

  it('returns null monthsToGoal for USD contribution when no exchange rate', () => {
    const usdFund = {
      ...baseFund,
      monthly_contribution_amount: 200,
      monthly_contribution_currency: 'USD' as const,
    }
    const result = computeSavingsProgress(usdFund)
    expect(result.monthsToGoal).toBeNull()
  })

  it('returns 0 progress for zero goal_amount_crc (avoids division by zero)', () => {
    const zeroGoal = { ...baseFund, goal_amount_crc: 0 }
    const result = computeSavingsProgress(zeroGoal)
    expect(result.progressPercent).toBe(0)
  })
})
