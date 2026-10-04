import { render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import SettingsPage from '@/app/(dashboard)/settings/page'

vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({
  auth: { getUser: async () => ({ data: { user: { id: 'local-test' } } }) },
  from: () => {
    const chain = {
      select: () => chain, eq: () => chain, order: () => chain,
      lte: () => chain, in: () => chain, limit: () => chain,
      then: (resolve: (result: { data: never[]; error: null }) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve),
    }
    return chain
  },
}) }))
vi.mock('@/app/(dashboard)/settings/actions', () => ({
  createCategoryAction: vi.fn(), updateCategoryAction: vi.fn(), deleteCategoryAction: vi.fn(),
  toggleCategoryStatusAction: vi.fn(), saveIncomeConfigAction: vi.fn(),
}))

it.each([undefined, 'invalid', 'income'])('muestra ingresos sin categorías ni incidencias para %s', async section => {
  render(await SettingsPage({ searchParams: Promise.resolve({ section }) }))
  expect(screen.getByLabelText('Monto primer pago')).toBeInTheDocument()
  expect(screen.queryByText('Categorías existentes')).not.toBeInTheDocument()
  expect(screen.queryByText('Correos con problemas')).not.toBeInTheDocument()
})

it('muestra solo categorías y mantiene su creación bajo demanda', async () => {
  render(await SettingsPage({ searchParams: Promise.resolve({ section: 'categories' }) }))
  expect(screen.getByText('Categorías existentes')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Crear categoría' })).not.toBeInTheDocument()
  expect(screen.queryByLabelText('Monto primer pago')).not.toBeInTheDocument()
  expect(screen.queryByText('Correos con problemas')).not.toBeInTheDocument()
})

it('muestra solo automatización sin formularios financieros', async () => {
  render(await SettingsPage({ searchParams: Promise.resolve({ section: 'automation' }) }))
  expect(screen.getByText('Correos con problemas')).toBeInTheDocument()
  expect(screen.queryByLabelText('Monto primer pago')).not.toBeInTheDocument()
  expect(screen.queryByText('Categorías existentes')).not.toBeInTheDocument()
})
