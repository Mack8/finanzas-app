import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { PageHeader } from './PageHeader'

it('expone el título principal de la página como h1', () => {
  render(<PageHeader title="Movimientos" description="Detalle del mes" />)
  expect(screen.getByRole('heading', { level: 1, name: 'Movimientos' })).toBeInTheDocument()
})
