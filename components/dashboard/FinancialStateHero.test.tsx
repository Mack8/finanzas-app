import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { FinancialStateHero } from './FinancialStateHero'

it('separates safe money from projected money', () => {
  render(<FinancialStateHero position={{ confirmedCRC: 200000, pendingCommitmentsCRC: 50000, safeCRC: 150000, projectedCRC: 250000, dailySafeCRC: 15000, horizonDays: 10, state: 'stable' }} />)
  expect(screen.getByText('Margen seguro')).toBeInTheDocument()
  expect(screen.getByText('Estimado · no disponible hoy')).toBeInTheDocument()
  expect(screen.getByText('Confirmado este mes')).toBeInTheDocument()
  expect(screen.getByText(/Margen seguro más ingreso configurado aún no registrado/)).toBeInTheDocument()
  expect(screen.getByText(/^₡150/).parentElement?.lastElementChild).toHaveTextContent(/El margen seguro ya reserva.*para compromisos pendientes/)
})

it('offers a usable configuration path when projected income is missing', () => {
  render(<FinancialStateHero position={{ confirmedCRC: 100000, pendingCommitmentsCRC: 0, safeCRC: 100000, projectedCRC: null, dailySafeCRC: 10000, horizonDays: 10, state: 'incomplete' }} />)
  expect(screen.getByRole('link', { name: /Configurá ingresos/ })).toHaveAttribute('href', '/settings')
  expect(screen.getByText(/Falta configurar un ingreso mensual para mostrar el estimado/)).toBeInTheDocument()
})

it('explains a negative margin as a deficit instead of a spending allowance', () => {
  render(<FinancialStateHero position={{ confirmedCRC: 20000, pendingCommitmentsCRC: 50000, safeCRC: -30000, projectedCRC: null, dailySafeCRC: -3000, horizonDays: 10, state: 'risk' }} />)
  expect(screen.getByRole('region', { name: /zona de riesgo/ })).toBeInTheDocument()
  expect(screen.getByText(/No hay margen para nuevos gastos/)).toBeInTheDocument()
})

it('colors a positive margin amber when its financial state needs attention', () => {
  render(<FinancialStateHero position={{ confirmedCRC: 120000, pendingCommitmentsCRC: 20000, safeCRC: 100000, projectedCRC: 180000, dailySafeCRC: 10000, horizonDays: 10, state: 'attention' }} />)

  expect(screen.getByText(/^₡100/)).toHaveClass('text-warning')
})

it('keeps the margin neutral when there is not enough data to project', () => {
  render(<FinancialStateHero position={{ confirmedCRC: 120000, pendingCommitmentsCRC: 20000, safeCRC: 100000, projectedCRC: null, dailySafeCRC: 10000, horizonDays: 10, state: 'incomplete' }} />)

  expect(screen.getByText(/^₡100/)).toHaveClass('text-muted-foreground')
})
