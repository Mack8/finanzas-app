import { render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { Breadcrumb } from './Breadcrumb'

const route = vi.hoisted(() => ({ path: '/' }))
vi.mock('next/navigation', () => ({ usePathname: () => route.path }))

it.each([['/', 'Resumen'], ['/transactions', 'Movimientos'], ['/cards', 'Cuentas']])('orienta al usuario en %s', (path, label) => {
  route.path = path
  render(<Breadcrumb />)
  expect(screen.getByText(label)).toBeInTheDocument()
})
