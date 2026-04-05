import { describe, expect, it } from 'vitest'
import { resolveAmountCRC, buildTransactionFilters } from './transactions'

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

describe('buildTransactionFilters', () => {
  it('returns empty object when params are empty', () => {
    expect(buildTransactionFilters({})).toEqual({})
  })

  it('parses valid YYYY-MM month into dateFrom/dateTo range', () => {
    const result = buildTransactionFilters({ month: '2026-04' })
    expect(result.dateFrom).toBe('2026-04-01')
    expect(result.dateTo).toBe('2026-04-30')
  })

  it('handles a month with 31 days', () => {
    const result = buildTransactionFilters({ month: '2026-01' })
    expect(result.dateTo).toBe('2026-01-31')
  })

  it('ignores malformed month param', () => {
    expect(buildTransactionFilters({ month: 'not-valid' }).dateFrom).toBeUndefined()
    expect(buildTransactionFilters({ month: '2026-13' }).dateFrom).toBeUndefined()
  })

  it('passes valid UUID as categoryId', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000'
    expect(buildTransactionFilters({ categoryId: uuid }).categoryId).toBe(uuid)
  })

  it('ignores categoryId that is not a UUID', () => {
    expect(buildTransactionFilters({ categoryId: 'not-a-uuid' }).categoryId).toBeUndefined()
  })

  it('parses valid transaction type', () => {
    expect(buildTransactionFilters({ type: 'personal' }).transactionType).toBe('personal')
    expect(buildTransactionFilters({ type: 'household' }).transactionType).toBe('household')
    expect(buildTransactionFilters({ type: 'reimbursement' }).transactionType).toBe('reimbursement')
  })

  it('ignores invalid transaction type', () => {
    expect(buildTransactionFilters({ type: 'unknown' }).transactionType).toBeUndefined()
  })

  it('parses valid currency', () => {
    expect(buildTransactionFilters({ currency: 'CRC' }).currency).toBe('CRC')
    expect(buildTransactionFilters({ currency: 'USD' }).currency).toBe('USD')
  })

  it('ignores invalid currency', () => {
    expect(buildTransactionFilters({ currency: 'EUR' }).currency).toBeUndefined()
  })
})
