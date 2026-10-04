import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mocks = vi.hoisted(() => ({ createSavingsFundAction: vi.fn() }))
vi.mock('@/app/(dashboard)/savings/actions', () => ({ createSavingsFundAction: mocks.createSavingsFundAction }))

import { CreateSavingsFundForm } from './CreateSavingsFundForm'
import { FormDialog } from '@/components/layout/FormDialog'

function renderForm() {
  return render(<FormDialog triggerLabel="Crear fondo de ahorro" title="Nuevo fondo de ahorro"><CreateSavingsFundForm latestExchangeRate={null} suggestedColor="#86a789" /></FormDialog>)
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Nombre'), 'Vacaciones')
  await user.type(screen.getByLabelText('Meta'), '100000')
  await user.type(screen.getByLabelText('Fecha meta'), '2027-01-01')
  await user.click(screen.getByRole('button', { name: 'Crear fondo' }))
}

beforeEach(() => vi.clearAllMocks())

it('keepsValuesAndDialogOpenOnValidationError', async () => {
  mocks.createSavingsFundAction.mockResolvedValue({ status: 'error', message: 'Revisá el fondo.' })
  const user = userEvent.setup()
  renderForm()
  await user.click(screen.getByRole('button', { name: 'Crear fondo de ahorro' }))
  await fillAndSubmit(user)

  const dialog = await screen.findByRole('dialog', { name: 'Nuevo fondo de ahorro' })
  expect(within(dialog).getByLabelText('Nombre')).toHaveValue('Vacaciones')
  expect(within(dialog).getByText('Revisá el fondo.')).toBeInTheDocument()
})

it('closesDialogOnSuccess', async () => {
  mocks.createSavingsFundAction.mockResolvedValue({ status: 'success', message: 'Creado.' })
  const user = userEvent.setup()
  renderForm()
  await user.click(screen.getByRole('button', { name: 'Crear fondo de ahorro' }))
  await fillAndSubmit(user)
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
})

it('resetsStateWhenReopened', async () => {
  mocks.createSavingsFundAction.mockResolvedValue({ status: 'error', message: 'Revisá el fondo.' })
  const user = userEvent.setup()
  renderForm()
  await user.click(screen.getByRole('button', { name: 'Crear fondo de ahorro' }))
  await fillAndSubmit(user)
  await screen.findByText('Revisá el fondo.')
  await user.click(screen.getByRole('button', { name: 'Close' }))
  await user.click(screen.getByRole('button', { name: 'Crear fondo de ahorro' }))

  const dialog = screen.getByRole('dialog', { name: 'Nuevo fondo de ahorro' })
  expect(within(dialog).getByLabelText('Nombre')).toHaveValue('')
  expect(within(dialog).queryByText('Revisá el fondo.')).not.toBeInTheDocument()
})

it('usesSuggestedFundColorByDefault', async () => {
  const user = userEvent.setup()
  renderForm()
  await user.click(screen.getByRole('button', { name: 'Crear fondo de ahorro' }))
  const dialog = screen.getByRole('dialog', { name: 'Nuevo fondo de ahorro' })
  expect(within(dialog).getByRole('radio', { name: /#86a789/i })).toBeChecked()
})
