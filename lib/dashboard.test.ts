import { describe, it, expect } from 'vitest'
import { computeTotals, computeBudgetProgress, getCurrentMonthCR } from './dashboard'

describe('computeTotals', () => {
  it('sums income, variable and fixed expenses, savings correctly', () => {
    const result = computeTotals([
      { amount_crc: 500000, category_type: 'income' },
      { amount_crc: 120000, category_type: 'fixed_expense' },
      { amount_crc: 30000, category_type: 'variable_expense' },
      { amount_crc: 50000, category_type: 'savings' },
    ])
    expect(result.income).toBe(500000)
    expect(result.expenses).toBe(150000)
    expect(result.savings).toBe(50000)
    expect(result.balance).toBe(300000)
  })

  it('returns all zeros for empty list', () => {
    const result = computeTotals([])
    expect(result.income).toBe(0)
    expect(result.expenses).toBe(0)
    expect(result.savings).toBe(0)
    expect(result.balance).toBe(0)
  })

  it('produces negative balance when expenses exceed income', () => {
    const result = computeTotals([
      { amount_crc: 100000, category_type: 'income' },
      { amount_crc: 150000, category_type: 'fixed_expense' },
    ])
    expect(result.balance).toBe(-50000)
  })
})

describe('computeBudgetProgress', () => {
  it('returns 0% usage for zero spending', () => {
    const result = computeBudgetProgress(0, 100000, 1)
    expect(result.usedPercent).toBe(0)
    expect(result.budgetCRC).toBe(100000)
  })

  it('computes correct percentage for CRC budget (multiplier = 1)', () => {
    const result = computeBudgetProgress(30000, 100000, 1)
    expect(result.budgetCRC).toBe(100000)
    expect(result.usedPercent).toBeCloseTo(30)
  })

  it('converts USD budget to CRC using exchange rate multiplier', () => {
    // 100 USD × 500 CRC/USD = 50000 CRC budget; 25000 spent = 50%
    const result = computeBudgetProgress(25000, 100, 500)
    expect(result.budgetCRC).toBe(50000)
    expect(result.usedPercent).toBeCloseTo(50)
  })

  it('can exceed 100% when over budget', () => {
    const result = computeBudgetProgress(150000, 100000, 1)
    expect(result.usedPercent).toBeCloseTo(150)
  })
})

describe('getCurrentMonthCR', () => {
  it('returns a valid year and month number', () => {
    const { year, month } = getCurrentMonthCR()
    expect(year).toBeGreaterThanOrEqual(2024)
    expect(month).toBeGreaterThanOrEqual(1)
    expect(month).toBeLessThanOrEqual(12)
  })
})
