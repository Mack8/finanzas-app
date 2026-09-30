import { describe, it, expect } from 'vitest'
import {
  computeTotals,
  computeBudgetProgress,
  getCurrentMonthCR,
  computeMomChange,
  computeFinancialRates,
  computeMonthPace,
  computeExpenseSplit,
} from './dashboard'

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

import { computeAvailableBalance } from './dashboard'

describe('computeAvailableBalance', () => {
  it('subtracts expenses, savings contributions, and active debts from income', () => {
    expect(computeAvailableBalance(825548, 200000, 50000, 150000)).toBe(425548)
  })

  it('can be negative when spending exceeds income', () => {
    expect(computeAvailableBalance(500000, 400000, 100000, 200000)).toBe(-200000)
  })

  it('returns income when no expenses, contributions, or debts', () => {
    expect(computeAvailableBalance(500000, 0, 0, 0)).toBe(500000)
  })

  it('returns 0 when everything is zero', () => {
    expect(computeAvailableBalance(0, 0, 0, 0)).toBe(0)
  })
})

describe('computeMomChange', () => {
  it('computes percent change vs previous month', () => {
    const result = computeMomChange(120, 100)
    expect(result.delta).toBe(20)
    expect(result.percent).toBe(20)
  })

  it('returns null percent when previous is zero and current is not', () => {
    expect(computeMomChange(50, 0).percent).toBeNull()
  })

  it('returns 0 percent when both are zero', () => {
    expect(computeMomChange(0, 0).percent).toBe(0)
  })
})

describe('computeFinancialRates', () => {
  it('computes savings and expense rates from income', () => {
    const rates = computeFinancialRates(
      { income: 1000, expenses: 600, savings: 200, balance: 200 },
      400,
      200,
    )
    expect(rates.savingsRate).toBe(20)
    expect(rates.expenseRate).toBe(60)
    expect(rates.fixedShare).toBeCloseTo(66.67)
    expect(rates.variableShare).toBeCloseTo(33.33)
  })

  it('returns null rates without income', () => {
    const rates = computeFinancialRates(
      { income: 0, expenses: 100, savings: 0, balance: -100 },
      100,
      0,
    )
    expect(rates.savingsRate).toBeNull()
    expect(rates.expenseRate).toBeNull()
  })
})

describe('computeMonthPace', () => {
  it('projects monthly expenses from daily burn', () => {
    const pace = computeMonthPace(150000, 15, 30)
    expect(pace.dailyBurn).toBe(10000)
    expect(pace.projectedExpenses).toBe(300000)
    expect(pace.elapsedPercent).toBe(50)
  })
})

describe('computeExpenseSplit', () => {
  it('splits fixed and variable expenses', () => {
    const split = computeExpenseSplit([
      { amount_crc: 100, category_type: 'fixed_expense' },
      { amount_crc: 40, category_type: 'variable_expense' },
      { amount_crc: 20, category_type: 'income' },
    ])
    expect(split.fixedExpenses).toBe(100)
    expect(split.variableExpenses).toBe(40)
  })
})
