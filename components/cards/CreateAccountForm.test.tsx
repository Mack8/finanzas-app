import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreationPanel } from '@/components/layout/CreationPanel'

const mocks = vi.hoisted(() => ({ createPaymentAccountAction: vi.fn() }))
vi.mock('@/app/(dashboard)/cards/actions', () => ({ createPaymentAccountAction: mocks.createPaymentAccountAction }))

import { CreateAccountForm } from './CreateAccountForm'

beforeEach(() => vi.clearAllMocks())

it('keepsDialogOpenOnValidationError', async () => {
  mocks.createPaymentAccountAction.mockResolvedValue({ status: 'error', message: 'Revisá la cuenta.' })
  const user = userEvent.setup()
  render(<CreationPanel label="Agregar cuenta" title="Nueva cuenta"><CreateAccountForm /></CreationPanel>)
  await user.click(screen.getByRole('button', { name: 'Agregar cuenta' }))
  await user.type(screen.getByLabelText('Nombre'), 'Cuenta principal')
  await user.click(screen.getByRole('button', { name: 'Guardar cuenta' }))

  const dialog = await screen.findByRole('dialog', { name: 'Nueva cuenta' })
  expect(within(dialog).getByLabelText('Nombre')).toHaveValue('Cuenta principal')
  expect(within(dialog).getByText('Revisá la cuenta.')).toBeInTheDocument()
})
