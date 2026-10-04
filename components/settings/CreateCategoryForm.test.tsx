import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreationPanel } from '@/components/layout/CreationPanel'
import { FINANCIAL_COLOR_PALETTE } from '@/lib/financial-colors'

const mocks = vi.hoisted(() => ({ createCategoryAction: vi.fn() }))
vi.mock('@/app/(dashboard)/settings/actions', () => ({ createCategoryAction: mocks.createCategoryAction }))

import { CreateCategoryForm, type SuggestedCategoryColors } from './CreateCategoryForm'

const suggestedColors: SuggestedCategoryColors = {
  income: FINANCIAL_COLOR_PALETTE[2],
  fixed_expense: FINANCIAL_COLOR_PALETTE[0],
  variable_expense: FINANCIAL_COLOR_PALETTE[1],
  savings: FINANCIAL_COLOR_PALETTE[3],
}

function renderForm() {
  return render(<CreationPanel label="Agregar categoría" title="Nueva categoría"><CreateCategoryForm suggestedColors={suggestedColors} /></CreationPanel>)
}

beforeEach(() => vi.clearAllMocks())

it('usesSuggestedCategoryColorByType', async () => {
  const user = userEvent.setup()
  renderForm()
  await user.click(screen.getByRole('button', { name: 'Agregar categoría' }))
  const dialog = screen.getByRole('dialog', { name: 'Nueva categoría' })
  expect(within(dialog).getByRole('radio', { name: FINANCIAL_COLOR_PALETTE[1] })).toHaveAttribute('aria-checked', 'true')
  await user.selectOptions(within(dialog).getByLabelText('Tipo'), 'income')
  await waitFor(() => expect(within(dialog).getByRole('radio', { name: FINANCIAL_COLOR_PALETTE[2] })).toHaveAttribute('aria-checked', 'true'))
})

it('keepsDialogOpenOnValidationError', async () => {
  mocks.createCategoryAction.mockResolvedValue({ status: 'error', message: 'Revisá la categoría.' })
  const user = userEvent.setup()
  renderForm()
  await user.click(screen.getByRole('button', { name: 'Agregar categoría' }))
  const dialog = screen.getByRole('dialog', { name: 'Nueva categoría' })
  await user.type(within(dialog).getByLabelText('Nombre'), 'Salud')
  await user.click(within(dialog).getByRole('button', { name: 'Crear categoría' }))

  expect(within(await screen.findByRole('dialog', { name: 'Nueva categoría' })).getByLabelText('Nombre')).toHaveValue('Salud')
  expect(within(dialog).getByText('Revisá la categoría.')).toBeInTheDocument()
})
