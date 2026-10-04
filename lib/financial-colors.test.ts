import { describe, expect, it } from 'vitest'
import { chooseBalancedFinancialColor, FINANCIAL_COLOR_PALETTE } from './financial-colors'

describe('chooseBalancedFinancialColor', () => {
  it('assigns the first palette color when no colors are used', () => {
    expect(chooseBalancedFinancialColor([])).toBe('#3b82f6')
  })

  it('chooses the least-used color and breaks ties by palette order', () => {
    expect(chooseBalancedFinancialColor(['#3b82f6', '#3b82f6', '#86a789'])).toBe('#eab676')
    expect(chooseBalancedFinancialColor(['#3b82f6'])).toBe('#86a789')
    expect(chooseBalancedFinancialColor(FINANCIAL_COLOR_PALETTE)).toBe('#3b82f6')
  })

  it('ignores colors outside the palette when balancing', () => {
    expect(chooseBalancedFinancialColor(['#3b82f6', '#ff00ff'])).toBe('#86a789')
  })
})
