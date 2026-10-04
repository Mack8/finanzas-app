import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { SavingsGoalProgress } from './SavingsGoalProgress'
import type { SavingsFundWithProgress } from '@/types/domain'

const fund: SavingsFundWithProgress = {
  id: 'fund-1',
  user_id: 'user-1',
  name: 'Viaje',
  goal_amount: 100000,
  goal_currency: 'CRC',
  goal_amount_crc: 100000,
  current_amount_crc: 35000,
  target_date: '2026-11-01',
  monthly_contribution_amount: 10000,
  monthly_contribution_currency: 'CRC',
  color: '#7851a9',
  is_active: true,
  created_at: '2026-01-01T12:00:00Z',
  progressPercent: 35,
  monthsToGoal: 7,
}

it('uses progress status colors without replacing the fund identity color', () => {
  render(<SavingsGoalProgress fund={fund} asOf={new Date('2026-06-01T12:00:00Z')} />)

  expect(screen.getByText('Leve rezago')).toHaveClass('text-warning')
  expect(screen.getByText(/^₡35/)).toHaveClass('text-warning')
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '35')
  expect(screen.getByRole('progressbar').firstChild).toHaveStyle({ backgroundColor: 'var(--warning)' })
})
