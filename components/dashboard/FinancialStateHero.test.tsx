import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { FinancialStateHero } from './FinancialStateHero'

it('separates safe money from projected money', () => {
  render(<FinancialStateHero position={{ confirmedCRC: 200000, pendingCommitmentsCRC: 50000, safeCRC: 150000, projectedCRC: 250000, dailySafeCRC: 15000, horizonDays: 10, state: 'stable' }} />)
  expect(screen.getByText('Margen seguro')).toBeInTheDocument()
  expect(screen.getByText('Proyectado')).toBeInTheDocument()
})

it('offers a usable configuration path when projected income is missing', () => {
  render(<FinancialStateHero position={{ confirmedCRC: 100000, pendingCommitmentsCRC: 0, safeCRC: 100000, projectedCRC: null, dailySafeCRC: 10000, horizonDays: 10, state: 'incomplete' }} />)
  expect(screen.getByRole('link', { name: /Configurá ingresos/ })).toHaveAttribute('href', '/settings')
})

it('explains a negative margin as a deficit instead of a spending allowance', () => {
  render(<FinancialStateHero position={{ confirmedCRC: 20000, pendingCommitmentsCRC: 50000, safeCRC: -30000, projectedCRC: null, dailySafeCRC: -3000, horizonDays: 10, state: 'risk' }} />)
  expect(screen.getByRole('region', { name: /zona de riesgo/ })).toBeInTheDocument()
  expect(screen.getByText(/No hay margen para nuevos gastos/)).toBeInTheDocument()
})
