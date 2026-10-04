import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TransactionFilters } from './TransactionFilters'

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }))
vi.mock('next/navigation', () => ({
  usePathname: () => '/transactions',
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams('month=2026-10&currency=CRC'),
}))

describe('TransactionFilters', () => {
  it('asocia las etiquetas y conserva los filtros al cambiar categoría', async () => {
    render(<TransactionFilters defaultMonth="2026-10" categories={[{ id: 'food', name: 'Comida', type: 'variable_expense' }]} />)
    expect(screen.getByLabelText('Mes')).toHaveValue('2026-10')
    expect(screen.getByLabelText('Tipo')).toHaveValue('')
    expect(screen.getByLabelText('Moneda')).toHaveValue('CRC')
    await userEvent.setup().selectOptions(screen.getByLabelText('Categoría'), 'food')
    expect(replace).toHaveBeenCalledWith('/transactions?month=2026-10&currency=CRC&categoryId=food')
  })
})
