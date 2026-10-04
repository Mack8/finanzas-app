import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { EditTransactionDialog } from './EditTransactionDialog'

const { save } = vi.hoisted(() => ({ save: vi.fn() }))
vi.mock('@/app/(dashboard)/transactions/actions', () => ({ updateTransactionAction: save }))

it('no permite reabrir una edición mientras el guardado anterior sigue pendiente', async () => {
  let complete!: (state: { status: 'success' }) => void
  save.mockImplementation(() => new Promise(resolve => { complete = resolve }))
  const category = { id: 'category', name: 'Comida', type: 'variable_expense' as const, color: '#497858' }
  render(<EditTransactionDialog transaction={{
    id: 'transaction', date: '2026-10-03', description: 'Compra', amount: 100,
    currency: 'CRC', transaction_type: 'personal', notes: null, payment_account_id: null, category,
  }} categories={[category]} latestExchangeRate={null} accounts={[]} />)
  const user = userEvent.setup()
  const trigger = screen.getByRole('button', { name: 'Editar' })
  await user.click(trigger)
  await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Guardando...' })).toBeDisabled())
  expect(trigger).toBeDisabled()
  await act(async () => complete({ status: 'success' }))
  await waitFor(() => expect(trigger).toBeEnabled())
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
