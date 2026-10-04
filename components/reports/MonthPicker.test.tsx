import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { MonthPicker } from './MonthPicker'

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }))
vi.mock('next/navigation', () => ({
  usePathname: () => '/reports',
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams('month=2026-10'),
}))

it('permite encontrar el mes por su etiqueta y navegar al seleccionado', () => {
  render(<MonthPicker defaultMonth="2026-10" />)
  fireEvent.change(screen.getByLabelText('Mes'), { target: { value: '2026-09' } })
  expect(replace).toHaveBeenCalledWith('/reports?month=2026-09')
})
