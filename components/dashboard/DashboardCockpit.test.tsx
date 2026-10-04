import { render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { buildCockpit } from '@/lib/dashboard-cockpit'
import { DashboardCockpit } from './DashboardCockpit'
import type { PaymentReminder } from '@/types/domain'

it('keeps one priority action and the mobile reading order before financial health', () => {
  const model = buildCockpit({
    cashFlow: {
      ledgerIncomeCRC: 200000, salaryIncomeCRC: 400000, expensesCRC: 20000,
      netExpensesCRC: 20000, reimbursementsCRC: 0, savingsCRC: 0,
      availableCRC: 180000, unpaidDebtsMonthlyCRC: 10000, unpaidRecurringMonthlyCRC: 0,
      pendingPlannedContributionsCRC: 20000, projectedAvailableCRC: 150000,
      usedSalaryFallback: false,
    },
    dayOfMonth: 15, daysInMonth: 30, transactionCount: 2, expensesByCategory: [],
  })
  const { container } = render(<DashboardCockpit model={model} savingsFunds={[]} debts={[]} />)
  expect(screen.getAllByRole('region', { name: 'Acción recomendada' })).toHaveLength(1)
  expect(within(screen.getByRole('region', { name: 'Acción recomendada' })).getAllByRole('link')).toHaveLength(1)
  const sections = [...container.querySelectorAll('section[aria-label], section[aria-labelledby]')]
  expect(sections.map(section => section.getAttribute('aria-label') ?? section.querySelector('h2')?.textContent)).toEqual([
    'Podés gastar con tranquilidad', 'Acción recomendada', 'Evidencia del mes', 'Salud financiera',
  ])
  expect(screen.getByRole('link', { name: /Crear fondo/ })).toHaveAttribute('href', '/savings')
})

it('surfaces overdue and upcoming payments without estimating a card amount', () => {
  const upcomingPayments: PaymentReminder[] = [
    { id: 'payment-1', kind: 'debt', name: 'Leasing', sourceId: 'debt-1', dueDate: '2026-10-01', status: 'overdue', amount: 30000, currency: 'CRC' },
    { id: 'card-1', kind: 'card', name: 'Visa', sourceId: 'card-1', dueDate: '2026-10-20', status: 'upcoming', amount: null, currency: null },
  ]
  const model = buildCockpit({
    cashFlow: {
      ledgerIncomeCRC: 200000, salaryIncomeCRC: 400000, expensesCRC: 20000,
      netExpensesCRC: 20000, reimbursementsCRC: 0, savingsCRC: 0,
      availableCRC: 180000, unpaidDebtsMonthlyCRC: 10000, unpaidRecurringMonthlyCRC: 0,
      pendingPlannedContributionsCRC: 20000, projectedAvailableCRC: 150000,
      usedSalaryFallback: false,
    },
    dayOfMonth: 15, daysInMonth: 30, transactionCount: 2, expensesByCategory: [], upcomingPayments,
  })
  render(<DashboardCockpit model={model} savingsFunds={[]} debts={[]} />)

  const panel = screen.getByRole('region', { name: 'Próximos pagos' })
  expect(within(panel).getByText('Leasing')).toBeInTheDocument()
  expect(within(panel).getByText('Visa')).toBeInTheDocument()
  expect(within(panel).getByText('Monto no disponible')).toBeInTheDocument()
  expect(within(panel).getByRole('link', { name: /Ver pagos/ })).toHaveAttribute('href', '/payments')
})
