import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { ReportMonthSummary } from './ReportMonthSummary'
import type { MonthlyTotalsRow } from '@/lib/reports'

const current: MonthlyTotalsRow = {
  month: '2026-06', income: 1000000, expenses: 400000, savings: 200000,
  reimbursements: 50000, netExpenses: 350000,
}

const previous: MonthlyTotalsRow = {
  month: '2026-05', income: 900000, expenses: 500000, savings: 100000,
  reimbursements: 0, netExpenses: 500000,
}

it('shows net savings, fund contributions, and free balance with previous-month comparisons', () => {
  render(<ReportMonthSummary current={current} previous={previous} />)

  expect(screen.getByText('Ahorro neto')).toBeInTheDocument()
  expect(screen.getByText(/^₡650/)).toBeInTheDocument()
  expect(screen.getByText('Aportes a fondos')).toBeInTheDocument()
  expect(screen.getByText(/^₡200/)).toBeInTheDocument()
  expect(screen.getByText('Saldo libre')).toBeInTheDocument()
  expect(screen.getByText(/^₡450/)).toBeInTheDocument()
  expect(screen.getByText('30% menos que el mes anterior')).toBeInTheDocument()
})

it('explains that a comparison is unavailable when the previous month has no transactions', () => {
  render(<ReportMonthSummary current={current} previous={undefined} />)

  expect(screen.getAllByText('Sin datos del mes anterior')).toHaveLength(2)
})
