import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mocks = vi.hoisted(() => ({ setDebtNextDueDateAction: vi.fn() }))
vi.mock('@/app/(dashboard)/debts/actions', () => ({ setDebtNextDueDateAction: mocks.setDebtNextDueDateAction }))

import { ConfigureDebtDueDateButton } from './ConfigureDebtDueDateButton'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.setDebtNextDueDateAction.mockResolvedValue({ status: 'error', message: 'No se pudo actualizar.' })
})

it('lets a legacy debt configure its next due date in a dialog', async () => {
  const user = userEvent.setup()
  render(<ConfigureDebtDueDateButton debtId="debt-legacy" debtName="Préstamo" />)

  await user.click(screen.getByRole('button', { name: 'Configurar vencimiento' }))
  const dateInput = screen.getByLabelText('Fecha de vencimiento')
  expect(dateInput).toBeRequired()
  await user.type(dateInput, '2026-11-30')
  await user.click(screen.getByRole('button', { name: 'Guardar fecha' }))

  expect(await screen.findByText('No se pudo actualizar.')).toBeInTheDocument()
  expect(mocks.setDebtNextDueDateAction).toHaveBeenCalled()
})
