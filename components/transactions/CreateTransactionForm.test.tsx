import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mocks = vi.hoisted(() => ({ createTransactionAction: vi.fn() }))
vi.mock('@/app/(dashboard)/transactions/actions', () => ({ createTransactionAction: mocks.createTransactionAction }))

import { CreateTransactionForm } from './CreateTransactionForm'
import { FormDialog } from '@/components/layout/FormDialog'

const categories = [{ id: '550e8400-e29b-41d4-a716-446655440000', name: 'Comida', type: 'variable_expense' as const, color: '#86a789' }]

function renderForm() {
  return render(<FormDialog triggerLabel="Registrar movimiento" title="Nuevo movimiento"><CreateTransactionForm categories={categories} latestExchangeRate={null} accounts={[]} /></FormDialog>)
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Monto'), '1250')
  await user.type(screen.getByLabelText('Descripción'), 'Compra')
  await user.selectOptions(screen.getByLabelText('Categoría'), categories[0].id)
  await user.click(screen.getByRole('button', { name: 'Guardar transacción' }))
}

beforeEach(() => vi.clearAllMocks())

it('keepsValuesAndDialogOpenOnValidationError', async () => {
  mocks.createTransactionAction.mockResolvedValue({ status: 'error', message: 'Revisá los datos.' })
  const user = userEvent.setup()
  renderForm()
  await user.click(screen.getByRole('button', { name: 'Registrar movimiento' }))
  await fillAndSubmit(user)

  const dialog = await screen.findByRole('dialog', { name: 'Nuevo movimiento' })
  expect(within(dialog).getByLabelText('Monto')).toHaveValue(1250)
  expect(within(dialog).getByLabelText('Descripción')).toHaveValue('Compra')
  expect(within(dialog).getByText('Revisá los datos.')).toBeInTheDocument()
})

it('closesDialogOnSuccess', async () => {
  mocks.createTransactionAction.mockResolvedValue({ status: 'success', message: 'Guardado.' })
  const user = userEvent.setup()
  renderForm()
  await user.click(screen.getByRole('button', { name: 'Registrar movimiento' }))
  await fillAndSubmit(user)
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
})

it('resetsStateWhenReopened', async () => {
  mocks.createTransactionAction.mockResolvedValue({ status: 'error', message: 'Revisá los datos.' })
  const user = userEvent.setup()
  renderForm()
  await user.click(screen.getByRole('button', { name: 'Registrar movimiento' }))
  await fillAndSubmit(user)
  await screen.findByText('Revisá los datos.')
  await user.click(screen.getByRole('button', { name: 'Close' }))
  await user.click(screen.getByRole('button', { name: 'Registrar movimiento' }))

  const dialog = screen.getByRole('dialog', { name: 'Nuevo movimiento' })
  expect(within(dialog).getByLabelText('Monto')).toHaveValue(null)
  expect(within(dialog).queryByText('Revisá los datos.')).not.toBeInTheDocument()
})
