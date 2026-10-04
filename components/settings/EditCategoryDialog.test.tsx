import { expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FINANCIAL_COLOR_PALETTE } from '@/lib/financial-colors'

const mocks = vi.hoisted(() => ({ updateCategoryAction: vi.fn() }))
vi.mock('@/app/(dashboard)/settings/actions', () => ({ updateCategoryAction: mocks.updateCategoryAction }))

import { EditCategoryDialog } from './EditCategoryDialog'

it('keepsLegacyCategoryColorSelectedWhenEditDialogOpens', async () => {
  const user = userEvent.setup()
  render(<EditCategoryDialog category={{
    id: 'category-1',
    name: 'Legacy',
    type: 'variable_expense',
    color: '#ff00ff',
    monthly_budget_amount: null,
    monthly_budget_currency: 'CRC',
  }} />)

  await user.click(screen.getByRole('button', { name: 'Editar' }))
  const dialog = screen.getByRole('dialog', { name: 'Editar categoría' })
  const colorGroup = within(dialog).getByRole('radiogroup', { name: 'Color' })
  expect(within(colorGroup).getByRole('radio', { name: '#ff00ff (actual)' })).toHaveAttribute('aria-checked', 'true')
  expect(within(colorGroup).getAllByRole('radio')).toHaveLength(FINANCIAL_COLOR_PALETTE.length + 1)
})

it('clearsActionErrorsWhenEditDialogReopens', async () => {
  mocks.updateCategoryAction.mockResolvedValue({
    status: 'error',
    message: 'Revisá los datos.',
    fieldErrors: { name: ['El nombre no es válido.'] },
  })
  const user = userEvent.setup()
  render(<EditCategoryDialog category={{
    id: 'category-1',
    name: 'Legacy',
    type: 'variable_expense',
    color: '#ff00ff',
    monthly_budget_amount: null,
    monthly_budget_currency: 'CRC',
  }} />)

  await user.click(screen.getByRole('button', { name: 'Editar' }))
  await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
  expect(await screen.findByText('El nombre no es válido.')).toBeInTheDocument()
  await user.click(screen.getAllByRole('button', { name: 'Close' })[0])
  await user.click(screen.getByRole('button', { name: 'Editar' }))

  const dialog = screen.getByRole('dialog', { name: 'Editar categoría' })
  expect(within(dialog).queryByText('El nombre no es válido.')).not.toBeInTheDocument()
  expect(within(dialog).getByLabelText('Nombre')).toHaveValue('Legacy')
})
