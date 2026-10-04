import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mocks = vi.hoisted(() => ({
  createRecurringObligationAction: vi.fn(),
  recordRecurringObligationPaymentAction: vi.fn(),
}))
vi.mock('@/app/(dashboard)/payments/actions', () => mocks)

import { CreateObligationForm } from './CreateObligationForm'
import { RecordObligationPaymentForm } from './RecordObligationPaymentForm'
import { FormDialog } from '@/components/layout/FormDialog'

const category = { id: '550e8400-e29b-41d4-a716-446655440000', name: 'Servicios', type: 'fixed_expense' as const }

beforeEach(() => {
  vi.clearAllMocks()
  mocks.createRecurringObligationAction.mockResolvedValue({ status: 'error', message: 'Revisá los datos.' })
  mocks.recordRecurringObligationPaymentAction.mockResolvedValue({ status: 'error', message: 'No se pudo guardar.' })
})

it('exposes only the five approved intervals in the creation dialog', async () => {
  const user = userEvent.setup()
  render(
    <FormDialog triggerLabel="Nueva obligación" title="Nueva obligación">
      <CreateObligationForm categories={[category]} accounts={[]} latestExchangeRate={null} />
    </FormDialog>,
  )
  await user.click(screen.getByRole('button', { name: 'Nueva obligación' }))

  const interval = screen.getByLabelText('Frecuencia')
  expect(interval).toHaveValue('1')
  expect(Array.from((interval as HTMLSelectElement).options).map(option => option.value)).toEqual(['1', '2', '3', '6', '12'])
})

it('prefills the expected amount but lets the user submit the actual variable payment', async () => {
  const user = userEvent.setup()
  render(
    <FormDialog triggerLabel="Registrar pago" title="Registrar pago">
      <RecordObligationPaymentForm obligationId="obligation-1" scheduledDueDate="2026-10-03" expectedAmount={25000} currency="CRC" latestExchangeRate={null} />
    </FormDialog>,
  )
  await user.click(screen.getByRole('button', { name: 'Registrar pago' }))
  const amount = screen.getByLabelText('Monto pagado')
  expect(amount).toHaveValue(25000)
  await user.clear(amount)
  await user.type(amount, '23750')
  await user.click(screen.getByRole('button', { name: 'Guardar pago' }))

  expect(await screen.findByText('No se pudo guardar.')).toBeInTheDocument()
  expect(mocks.recordRecurringObligationPaymentAction).toHaveBeenCalled()
})
