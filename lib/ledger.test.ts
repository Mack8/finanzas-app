import { describe, it, expect } from 'vitest'
import {
  computeLedgerTotals,
  computeProjectedCashFlow,
  computeLedgerAvailable,
} from './ledger'

describe('computeLedgerTotals', () => {
  it('separates income, expenses, savings and reimbursements', () => {
    const totals = computeLedgerTotals([
      { amount_crc: 1000, category_type: 'income' },
      { amount_crc: 200, category_type: 'fixed_expense' },
      { amount_crc: 100, category_type: 'variable_expense' },
      { amount_crc: 50, category_type: 'variable_expense', transaction_type: 'reimbursement' },
      { amount_crc: 150, category_type: 'savings' },
    ])
    expect(totals.income).toBe(1000)
    expect(totals.expenses).toBe(350)
    expect(totals.reimbursements).toBe(50)
    expect(totals.netExpenses).toBe(300)
    expect(totals.savings).toBe(150)
    expect(totals.balance).toBe(500)
  })

  it('does not treat savings as expenses', () => {
    const totals = computeLedgerTotals([
      { amount_crc: 500, category_type: 'income' },
      { amount_crc: 200, category_type: 'savings' },
    ])
    expect(totals.expenses).toBe(0)
    expect(totals.savings).toBe(200)
    expect(totals.balance).toBe(300)
  })
})

describe('computeProjectedCashFlow', () => {
  it('uses ledger balance as available', () => {
    const ledger = computeLedgerTotals([
      { amount_crc: 800, category_type: 'income' },
      { amount_crc: 300, category_type: 'fixed_expense' },
      { amount_crc: 100, category_type: 'savings' },
    ])
    const result = computeProjectedCashFlow({
      ledger,
      salaryIncomeCRC: 1000,
      unpaidDebtsMonthlyCRC: 200,
      unpaidRecurringMonthlyCRC: 0,
      pendingPlannedContributionsCRC: 50,
    })
    expect(result.ledgerBalance).toBe(400)
    expect(result.usedSalaryFallback).toBe(false)
    expect(result.projectedAvailable).toBe(800 - 300 - 100 - 200 - 50)
  })

  it('falls back to salary when no income txs', () => {
    const ledger = computeLedgerTotals([
      { amount_crc: 200, category_type: 'variable_expense' },
    ])
    const result = computeProjectedCashFlow({
      ledger,
      salaryIncomeCRC: 900,
      unpaidDebtsMonthlyCRC: 100,
      unpaidRecurringMonthlyCRC: 0,
      pendingPlannedContributionsCRC: 0,
    })
    expect(result.usedSalaryFallback).toBe(true)
    expect(result.effectiveIncome).toBe(900)
    expect(result.projectedAvailable).toBe(600)
  })

  it('does not double-count unpaid debts already zeroed', () => {
    const ledger = computeLedgerTotals([
      { amount_crc: 1000, category_type: 'income' },
      { amount_crc: 150, category_type: 'fixed_expense', debt_id: 'd1' },
    ])
    const result = computeProjectedCashFlow({
      ledger,
      salaryIncomeCRC: 1000,
      unpaidDebtsMonthlyCRC: 0,
      unpaidRecurringMonthlyCRC: 0,
      pendingPlannedContributionsCRC: 0,
    })
    expect(result.ledgerBalance).toBe(850)
    expect(result.projectedAvailable).toBe(850)
  })

  it('subtracts unpaid recurring obligations separately from debt and savings commitments', () => {
    const ledger = computeLedgerTotals([{ amount_crc: 100000, category_type: 'income' }])
    const result = computeProjectedCashFlow({
      ledger,
      salaryIncomeCRC: 100000,
      unpaidDebtsMonthlyCRC: 10000,
      unpaidRecurringMonthlyCRC: 15000,
      pendingPlannedContributionsCRC: 5000,
    })
    expect(result.projectedAvailable).toBe(70000)
  })
})

describe('computeLedgerAvailable', () => {
  it('equals ledger balance', () => {
    const ledger = computeLedgerTotals([
      { amount_crc: 100, category_type: 'income' },
      { amount_crc: 40, category_type: 'variable_expense' },
    ])
    expect(computeLedgerAvailable(ledger)).toBe(60)
  })
})
