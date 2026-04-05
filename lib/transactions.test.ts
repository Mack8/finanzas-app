import { describe, expect, it } from 'vitest'
import { resolveAmountCRC } from './transactions'

describe('resolveAmountCRC', () => {
  it('returns the same amount for CRC transactions', () => {
    expect(resolveAmountCRC(12500, 'CRC', null)).toEqual({
      amountCRC: 12500,
      exchangeRateId: null,
    })
  })

  it('converts USD using the latest exchange rate', () => {
    expect(
      resolveAmountCRC(10, 'USD', {
        id: 'rate-1',
        date: '2026-04-04',
        usd_to_crc: 508.25,
      })
    ).toEqual({
      amountCRC: 5082.5,
      exchangeRateId: 'rate-1',
    })
  })

  it('throws when USD is used without an exchange rate', () => {
    expect(() => resolveAmountCRC(10, 'USD', null)).toThrow(
      'No hay tipo de cambio disponible para registrar montos en USD.'
    )
  })
})
