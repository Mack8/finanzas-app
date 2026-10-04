import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreationPanel } from '@/components/layout/CreationPanel'

const mocks = vi.hoisted(() => ({ saveIncomeConfigAction: vi.fn() }))
vi.mock('@/app/(dashboard)/settings/actions', () => ({ saveIncomeConfigAction: mocks.saveIncomeConfigAction }))

import { IncomeConfigForm } from './IncomeConfigForm'

beforeEach(() => vi.clearAllMocks())

it('keepsDialogOpenOnValidationError', async () => {
  mocks.saveIncomeConfigAction.mockResolvedValue({ status: 'error', message: 'Revisá los ingresos.' })
  const user = userEvent.setup()
  render(<CreationPanel label="Configurar ingresos" title="Configuración de ingresos"><IncomeConfigForm currentConfig={null} /></CreationPanel>)
  await user.click(screen.getByRole('button', { name: 'Configurar ingresos' }))
  await user.type(screen.getByLabelText('Monto primer pago'), '500000')
  await user.type(screen.getByLabelText('Día del primer pago'), '15')
  await user.click(screen.getByRole('button', { name: 'Guardar configuración' }))

  const dialog = await screen.findByRole('dialog', { name: 'Configuración de ingresos' })
  expect(within(dialog).getByLabelText('Monto primer pago')).toHaveValue(500000)
  expect(within(dialog).getByText('Revisá los ingresos.')).toBeInTheDocument()
})
