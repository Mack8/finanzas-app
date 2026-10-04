import { describe, it, expect } from 'vitest'
import {
  computeTotals,
  computeBudgetProgress,
  getCurrentMonthCR,
  computeMomChange,
  computeFinancialRates,
  computeMonthPace,
  computeExpenseSplit,
  computeFinancialPosition,
  computeMonthlyUnpaidCommitments,
  buildUpcomingPayments,
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

describe('computeFinancialPosition', () => {
  it('separates safe and projected money without double-counting commitments', () => {
    expect(computeFinancialPosition({ confirmedCRC: 200000, pendingCommitmentsCRC: 50000, futureIncomeCRC: 100000, horizonDays: 10, projectedExpensesCRC: 0 })).toMatchObject({ safeCRC: 150000, projectedCRC: 250000, dailySafeCRC: 15000, state: 'stable' })
  })

  it('marks a negative safe margin as risk', () => {
    expect(computeFinancialPosition({ confirmedCRC: 20000, pendingCommitmentsCRC: 50000, futureIncomeCRC: null, horizonDays: 10, projectedExpensesCRC: 0 }).state).toBe('risk')
  })

  it('does not invent a projected amount without configured future income', () => {
    expect(computeFinancialPosition({ confirmedCRC: 100000, pendingCommitmentsCRC: 0, futureIncomeCRC: null, horizonDays: 10, projectedExpensesCRC: 0 }).projectedCRC).toBeNull()
  })
})

describe('monthly unpaid commitment reservations', () => {
  it('reserves only dated debt and recurring occurrences falling in the requested month', () => {
    const result = computeMonthlyUnpaidCommitments(
      [
        { id: 'debt-current', monthly_amount_crc: 30000, is_active: true, next_due_date: '2026-10-31' },
        { id: 'debt-last-month', monthly_amount_crc: 40000, is_active: true, next_due_date: '2026-09-30' },
      ],
      [
        { id: 'bill-current', expected_amount_crc: 12000, is_active: true, next_due_date: '2026-10-15' },
        { id: 'bill-next-month', expected_amount_crc: 7000, is_active: true, next_due_date: '2026-11-15' },
      ],
      [],
      2026,
      10,
    )
    expect(result).toEqual({ unpaidDebtsMonthlyCRC: 30000, unpaidRecurringMonthlyCRC: 12000 })
  })

  it('keeps the old monthly debt reservation until dated and avoids subtracting a paid occurrence twice', () => {
    const result = computeMonthlyUnpaidCommitments(
      [
        { id: 'legacy-unpaid', monthly_amount_crc: 20000, is_active: true, next_due_date: null },
        { id: 'legacy-paid', monthly_amount_crc: 15000, is_active: true, next_due_date: null },
        { id: 'dated-paid', monthly_amount_crc: 9000, is_active: true, next_due_date: '2026-10-10' },
      ],
      [
        { id: 'bill-paid', expected_amount_crc: 5000, is_active: true, next_due_date: '2026-10-12' },
        { id: 'bill-next-occurrence', expected_amount_crc: 8000, is_active: true, next_due_date: '2026-10-20' },
      ],
      [
        { debt_id: 'legacy-paid', recurring_obligation_id: null, scheduled_due_date: null },
        { debt_id: 'dated-paid', recurring_obligation_id: null, scheduled_due_date: '2026-10-10' },
        { debt_id: null, recurring_obligation_id: 'bill-paid', scheduled_due_date: '2026-10-12' },
        { debt_id: null, recurring_obligation_id: 'bill-next-occurrence', scheduled_due_date: '2026-09-20' },
      ],
      2026,
      10,
    )
    expect(result).toEqual({ unpaidDebtsMonthlyCRC: 20000, unpaidRecurringMonthlyCRC: 8000 })
  })
})

describe('dashboard payment window', () => {
  it('shows overdue items and due dates through day 30, includes cards without amounts, and excludes inactive items', () => {
    const result = buildUpcomingPayments({
      today: '2026-10-04',
      debts: [
        { id: 'd1', name: 'Leasing', monthly_amount: 30000, currency: 'CRC', next_due_date: '2026-10-01', payment_account_id: null },
        { id: 'd2', name: 'Later', monthly_amount: 10000, currency: 'CRC', next_due_date: '2026-11-04', payment_account_id: null },
      ],
      obligations: [
        { id: 'r1', name: 'Internet', expected_amount: 25000, currency: 'CRC', next_due_date: '2026-11-03', payment_account_id: null, is_active: true },
        { id: 'r2', name: 'Inactive', expected_amount: 5000, currency: 'CRC', next_due_date: '2026-10-10', payment_account_id: null, is_active: false },
      ],
      accounts: [
        { id: 'c1', name: 'Visa', type: 'credit_card', payment_due_day: 31, is_active: true },
        { id: 'c2', name: 'Cuenta', type: 'bank_account', payment_due_day: 10, is_active: true },
      ],
    })
    expect(result.map(item => [item.name, item.dueDate, item.status])).toEqual([
      ['Leasing', '2026-10-01', 'overdue'],
      ['Visa', '2026-10-31', 'upcoming'],
      ['Internet', '2026-11-03', 'upcoming'],
    ])
    expect(result[1]).toMatchObject({ amount: null, currency: null, kind: 'card' })
  })
})
