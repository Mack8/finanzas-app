import { describe, expect, it } from 'vitest'
import type { CashFlowBreakdown } from './dashboard'
import { buildCockpit } from './dashboard-cockpit'

const cashFlow: CashFlowBreakdown = {
  ledgerIncomeCRC: 300000, salaryIncomeCRC: 600000,
  expensesCRC: 50000, netExpensesCRC: 50000, reimbursementsCRC: 0,
  savingsCRC: 0, unpaidDebtsMonthlyCRC: 20000,
  pendingPlannedContributionsCRC: 30000, availableCRC: 250000,
  projectedAvailableCRC: 200000, usedSalaryFallback: false,
}

function cockpit(overrides: Partial<CashFlowBreakdown> = {}, transactionCount = 2, dayOfMonth = 10) {
  return buildCockpit({
    cashFlow: { ...cashFlow, ...overrides }, transactionCount,
    dayOfMonth, daysInMonth: 30,
    expensesByCategory: [
      { categoryId: 'food', categoryName: 'Alimentación', categoryColor: '#fff', totalCRC: 40000 },
      { categoryId: 'transport', categoryName: 'Transporte', categoryColor: '#fff', totalCRC: 10000 },
    ],
  })
}

describe('cockpit financial decisions', () => {
  it('adds only the configured income still unrecorded to the safe margin', () => {
    expect(cockpit().position).toMatchObject({ safeCRC: 200000, projectedCRC: 500000 })
  })

  it('does not project the salary again when it is fully recorded', () => {
    expect(cockpit({ ledgerIncomeCRC: 600000 }).position.projectedCRC).toBe(200000)
  })

  it('does not subtract income above the configured amount from the projection', () => {
    expect(cockpit({ ledgerIncomeCRC: 700000 }).position.projectedCRC).toBe(200000)
  })

  it('compares remaining spending with remaining money rather than the whole month', () => {
    const result = cockpit({ availableCRC: 170000 })
    // 120000 safe; 5000/day * 21 remaining days = 105000.
    expect(result.position.state).toBe('stable')
    expect(result.remainingExpensesCRC).toBe(105000)
    expect(result.position.horizonDays).toBe(21)
  })

  it('includes today on the last day of the month', () => {
    expect(cockpit({}, 2, 30).position.horizonDays).toBe(1)
  })

  it('guides an empty ledger to register money even with configured salary', () => {
    const result = cockpit({ ledgerIncomeCRC: 0, availableCRC: 0, expensesCRC: 0, unpaidDebtsMonthlyCRC: 0, pendingPlannedContributionsCRC: 0 }, 0)
    expect(result.position.state).toBe('incomplete')
    expect(result.action.href).toBe('/transactions')
    expect(result.evidence.pace).toContain('Sin movimientos')
  })

  it('prioritizes recording money when an empty ledger already has planned commitments', () => {
    const result = cockpit({ ledgerIncomeCRC: 0, availableCRC: 0, expensesCRC: 0 }, 0)
    expect(result.position.state).toBe('incomplete')
    expect(result.position.safeCRC).toBe(-50000)
    expect(result.position.dailySafeCRC).toBeLessThanOrEqual(0)
    expect(result.action.href).toBe('/transactions')
    expect(result.action.title).toContain('Registrá')
  })

  it('guides missing income configuration to settings without inventing a projection', () => {
    const result = cockpit({ salaryIncomeCRC: null })
    expect(result.position.projectedCRC).toBeNull()
    expect(result.action.href).toBe('/settings')
  })

  it('prioritizes a deficit over setup and never offers a positive daily guardrail', () => {
    const result = cockpit({ availableCRC: 20000, salaryIncomeCRC: null })
    expect(result.position.state).toBe('risk')
    expect(result.position.dailySafeCRC).toBeLessThanOrEqual(0)
    expect(result.action.href).toBe('/debts')
  })

  it('uses actual spending to identify the driver even without a category budget', () => {
    expect(cockpit().evidence.driver).toContain('Alimentación')
    expect(cockpit().evidence.driver).toContain('80%')
  })

  it('offers a spending review when the remaining pace exceeds the safe margin', () => {
    const result = cockpit({ availableCRC: 100000 })
    expect(result.position.state).toBe('attention')
    expect(result.action.href).toBe('/transactions')
    expect(result.action.impact).toContain('55')
  })

  it('does not reassure that spending is safe when the margin is exactly zero', () => {
    const result = cockpit({ availableCRC: 50000, expensesCRC: 0 })
    expect(result.position.state).toBe('attention')
    expect(result.action.href).toBe('/transactions')
    expect(result.action.title).toContain('saldo')
  })
})
