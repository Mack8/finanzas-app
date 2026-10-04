import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mocks = vi.hoisted(() => ({ createDebtAction: vi.fn() }))
vi.mock('@/app/(dashboard)/debts/actions', () => ({ createDebtAction: mocks.createDebtAction }))

import { CreateDebtForm } from './CreateDebtForm'
import { FormDialog } from '@/components/layout/FormDialog'

function renderForm() {
  return render(<FormDialog triggerLabel="Registrar deuda" title="Nueva deuda"><CreateDebtForm latestExchangeRate={null} /></FormDialog>)
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Nombre'), 'Préstamo')
  await user.type(screen.getByLabelText('Monto mensual'), '25000')
  await user.type(screen.getByLabelText('Total de cuotas'), '12')
  await user.type(screen.getByLabelText('Fecha de inicio'), '2026-10-01')
  await user.type(screen.getByLabelText('Próxima fecha de vencimiento'), '2026-11-01')
  await user.click(screen.getByRole('button', { name: 'Registrar deuda' }))
}

beforeEach(() => vi.clearAllMocks())

it('requires an exact next due date when creating a debt', async () => {
  const user = userEvent.setup()
  renderForm()
  await user.click(screen.getByRole('button', { name: 'Registrar deuda' }))
  expect(screen.getByLabelText('Próxima fecha de vencimiento')).toBeRequired()
  expect(mocks.createDebtAction).not.toHaveBeenCalled()
})

it('keepsValuesAndDialogOpenOnValidationError', async () => {
  mocks.createDebtAction.mockResolvedValue({ status: 'error', message: 'Revisá la deuda.' })
  const user = userEvent.setup()
  renderForm()
  await user.click(screen.getByRole('button', { name: 'Registrar deuda' }))
  await fillAndSubmit(user)

  const dialog = await screen.findByRole('dialog', { name: 'Nueva deuda' })
  expect(within(dialog).getByLabelText('Nombre')).toHaveValue('Préstamo')
  expect(within(dialog).getByText('Revisá la deuda.')).toBeInTheDocument()
})

it('closesDialogOnSuccess', async () => {
  mocks.createDebtAction.mockResolvedValue({ status: 'success', message: 'Creada.' })
  const user = userEvent.setup()
  renderForm()
  await user.click(screen.getByRole('button', { name: 'Registrar deuda' }))
  await fillAndSubmit(user)
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
})

it('resetsStateWhenReopened', async () => {
  mocks.createDebtAction.mockResolvedValue({ status: 'error', message: 'Revisá la deuda.' })
  const user = userEvent.setup()
  renderForm()
  await user.click(screen.getByRole('button', { name: 'Registrar deuda' }))
  await fillAndSubmit(user)
  await screen.findByText('Revisá la deuda.')
  await user.click(screen.getByRole('button', { name: 'Close' }))
  await user.click(screen.getByRole('button', { name: 'Registrar deuda' }))

  const dialog = screen.getByRole('dialog', { name: 'Nueva deuda' })
  expect(within(dialog).getByLabelText('Nombre')).toHaveValue('')
  expect(within(dialog).queryByText('Revisá la deuda.')).not.toBeInTheDocument()
})
