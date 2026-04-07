import { describe, it, expect } from 'vitest'
import { computeMonthlyIncomeCRC } from './income'

const baseCRCConfig = {
  first_payment_amount: 384233.53,
  second_payment_amount: 441314.13,
  currency: 'CRC' as const,
}

describe('computeMonthlyIncomeCRC', () => {
  it('CRC: sums first and second payment', () => {
    expect(computeMonthlyIncomeCRC(baseCRCConfig)).toBe(825547.66)
  })

  it('CRC: returns first payment only when second is null', () => {
    const config = { ...baseCRCConfig, second_payment_amount: null }
    expect(computeMonthlyIncomeCRC(config)).toBe(384233.53)
  })

  it('USD: converts total to CRC using provided rate', () => {
    const config = { first_payment_amount: 1000, second_payment_amount: 500, currency: 'USD' as const }
    // (1000 + 500) × 500 = 750000
    expect(computeMonthlyIncomeCRC(config, 500)).toBe(750000)
  })

  it('USD: returns 0 when no exchange rate provided', () => {
    const config = { first_payment_amount: 1000, second_payment_amount: null, currency: 'USD' as const }
    expect(computeMonthlyIncomeCRC(config)).toBe(0)
  })
})
