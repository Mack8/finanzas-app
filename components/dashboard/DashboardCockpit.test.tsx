import { render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { buildCockpit } from '@/lib/dashboard-cockpit'
import { DashboardCockpit } from './DashboardCockpit'

it('keeps one priority action and the mobile reading order before financial health', () => {
  const model = buildCockpit({
    cashFlow: {
      ledgerIncomeCRC: 200000, salaryIncomeCRC: 400000, expensesCRC: 20000,
      netExpensesCRC: 20000, reimbursementsCRC: 0, savingsCRC: 0,
      availableCRC: 180000, unpaidDebtsMonthlyCRC: 10000,
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
