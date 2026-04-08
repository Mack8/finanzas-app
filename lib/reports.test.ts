import { describe, it, expect } from 'vitest'
import { groupExpensesByCategory, buildMonthlyTotals } from './reports'

// --- groupExpensesByCategory ---

const tx = (amount_crc: number, type: string, id: string, name: string, color: string) =>
  ({ amount_crc, category_type: type as never, categoryId: id, categoryName: name, categoryColor: color })

describe('groupExpensesByCategory', () => {
  it('sums amounts per category and sorts by total desc', () => {
    const result = groupExpensesByCategory([
      tx(10000, 'fixed_expense',    'a', 'Luz',    '#ff0000'),
      tx(5000,  'fixed_expense',    'a', 'Luz',    '#ff0000'),
      tx(20000, 'variable_expense', 'b', 'Comida', '#00ff00'),
    ])
    expect(result).toEqual([
      { categoryId: 'b', categoryName: 'Comida', categoryColor: '#00ff00', totalCRC: 20000 },
      { categoryId: 'a', categoryName: 'Luz',    categoryColor: '#ff0000', totalCRC: 15000 },
    ])
  })

  it('ignores income and savings transactions', () => {
    const result = groupExpensesByCategory([
      tx(50000, 'income',   'x', 'Salario', '#fff'),
      tx(10000, 'savings',  'y', 'Ahorro',  '#fff'),
      tx(8000,  'variable_expense', 'z', 'Misc', '#aaa'),
    ])
    expect(result).toEqual([
      { categoryId: 'z', categoryName: 'Misc', categoryColor: '#aaa', totalCRC: 8000 },
    ])
  })

  it('returns empty array when no expense transactions', () => {
    expect(groupExpensesByCategory([])).toEqual([])
  })
})

// --- buildMonthlyTotals ---

const mTx = (amount_crc: number, type: string, month: string) =>
  ({ amount_crc, category_type: type as never, month })

describe('buildMonthlyTotals', () => {
  it('aggregates income, expenses, and savings per month, sorted asc', () => {
    const result = buildMonthlyTotals([
      mTx(100000, 'income',           '2026-01'),
      mTx(30000,  'fixed_expense',    '2026-01'),
      mTx(10000,  'variable_expense', '2026-01'),
      mTx(5000,   'savings',          '2026-01'),
      mTx(120000, 'income',           '2026-02'),
      mTx(25000,  'fixed_expense',    '2026-02'),
    ])
    expect(result).toEqual([
      { month: '2026-01', income: 100000, expenses: 40000, savings: 5000 },
      { month: '2026-02', income: 120000, expenses: 25000, savings: 0 },
    ])
  })

  it('returns empty array for empty input', () => {
    expect(buildMonthlyTotals([])).toEqual([])
  })

  it('ignores unknown category types', () => {
    const result = buildMonthlyTotals([
      mTx(50000, 'unknown_type', '2026-03'),
      mTx(20000, 'income',       '2026-03'),
    ])
    expect(result).toEqual([
      { month: '2026-03', income: 20000, expenses: 0, savings: 0 },
    ])
  })
})
