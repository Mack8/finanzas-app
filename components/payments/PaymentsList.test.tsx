import { expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/app/(dashboard)/payments/actions', () => ({
  createRecurringObligationAction: vi.fn(),
  updateRecurringObligationAction: vi.fn(),
  deactivateRecurringObligationAction: vi.fn(),
  recordRecurringObligationPaymentAction: vi.fn(),
}))
vi.mock('@/app/(dashboard)/debts/actions', () => ({
  markInstallmentPaidAction: vi.fn(),
  setDebtNextDueDateAction: vi.fn(),
  deleteDebtAction: vi.fn(),
}))

import { PaymentsList } from './PaymentsList'
import type { PaymentReminder } from '@/types/domain'

const reminders: PaymentReminder[] = [
  { id: 'debt-overdue', kind: 'debt', name: 'Leasing', sourceId: 'debt-1', dueDate: '2026-10-01', status: 'overdue', amount: 25000, currency: 'CRC' },
  { id: 'legacy-debt', kind: 'debt', name: 'Préstamo antiguo', sourceId: 'debt-2', dueDate: null, status: 'upcoming', amount: 12000, currency: 'CRC' },
  { id: 'recurring-upcoming', kind: 'recurring', name: 'Internet', sourceId: 'obligation-1', dueDate: '2026-10-15', status: 'upcoming', amount: 25000, currency: 'CRC' },
  { id: 'recurring-paid', kind: 'recurring', name: 'Electricidad', sourceId: 'obligation-2', dueDate: '2026-10-02', status: 'paid', amount: 23750, currency: 'CRC', paidOn: '2026-10-02' },
  { id: 'card-reminder', kind: 'card', name: 'Visa principal', sourceId: 'card-1', dueDate: '2026-10-20', status: 'upcoming', amount: null, currency: null },
]
const debts = [{
  id: 'debt-2', user_id: 'user-1', name: 'Préstamo antiguo', monthly_amount: 12000,
  currency: 'CRC' as const, monthly_amount_crc: 12000, total_installments: 10,
  paid_installments: 2, start_date: '2025-01-01', next_due_date: null, due_day: null,
  payment_account_id: null, notes: null, is_active: true, created_at: '2025-01-01T00:00:00Z',
}]
const obligations = [{
  id: 'obligation-1', user_id: 'user-1', name: 'Internet', notes: null,
  expected_amount: 25000, currency: 'CRC' as const, expected_amount_crc: 25000,
  category_id: '550e8400-e29b-41d4-a716-446655440000', transaction_type: 'personal' as const,
  payment_account_id: null, next_due_date: '2026-10-15', due_day: 15, interval_months: 1,
  is_active: true, created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z',
}]

it('renders accessible due labels and shows no amount or payment action for card reminders', () => {
  render(<PaymentsList reminders={reminders} debts={debts} obligations={obligations} categories={[]} accounts={[]} latestExchangeRate={null} />)

  expect(within(screen.getByRole('listitem', { name: /Leasing/ })).getByText('Vencido')).toBeInTheDocument()
  expect(within(screen.getByRole('listitem', { name: /Internet/ })).getByText('Próximo')).toBeInTheDocument()
  expect(within(screen.getByRole('listitem', { name: /Electricidad/ })).getByText('Pagado')).toBeInTheDocument()
  const cardRow = screen.getByRole('listitem', { name: /Visa principal/ })
  expect(within(cardRow).getByText('Monto no disponible')).toBeInTheDocument()
  expect(within(cardRow).queryByRole('button', { name: /registrar pago/i })).not.toBeInTheDocument()
})

it('filters overdue items and provides a configuration action for legacy debts', async () => {
  const user = userEvent.setup()
  render(<PaymentsList reminders={reminders} debts={debts} obligations={obligations} categories={[]} accounts={[]} latestExchangeRate={null} />)

  await user.click(screen.getByRole('button', { name: 'Vencidos' }))
  expect(screen.getByText('Leasing')).toBeInTheDocument()
  expect(screen.queryByText('Internet')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Próximos' }))
  expect(screen.getByText('Préstamo antiguo')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Configurar vencimiento' })).toBeInTheDocument()
})
