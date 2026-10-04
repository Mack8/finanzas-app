import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { SettingsNavigation } from './SettingsNavigation'

it('enlaza las tres tareas y marca únicamente la sección seleccionada', () => {
  render(<SettingsNavigation section="categories" />)
  expect(screen.getByRole('navigation', { name: 'Secciones de configuración' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Ingresos' })).toHaveAttribute('href', '/settings?section=income')
  expect(screen.getByRole('link', { name: 'Categorías' })).toHaveAttribute('href', '/settings?section=categories')
  expect(screen.getByRole('link', { name: 'Categorías' })).toHaveAttribute('aria-current', 'page')
  expect(screen.getByRole('link', { name: 'Automatización' })).toHaveAttribute('href', '/settings?section=automation')
  expect(screen.getByRole('link', { name: 'Ingresos' })).not.toHaveAttribute('aria-current')
})
