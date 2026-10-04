import { describe, expect, it } from 'vitest'
import { addMonthsAtAnchor, classifyDueDate } from './payment-schedule'

describe('addMonthsAtAnchor', () => {
  it.each([
    ['2026-01-15', 1, 15, '2026-02-15'],
    ['2026-01-31', 1, 31, '2026-02-28'],
    ['2026-02-28', 1, 31, '2026-03-31'],
    ['2024-01-31', 1, 31, '2024-02-29'],
    ['2026-11-30', 3, 30, '2027-02-28'],
    ['2026-01-31', 2, 31, '2026-03-31'],
    ['2026-01-31', 3, 31, '2026-04-30'],
    ['2026-01-31', 6, 31, '2026-07-31'],
    ['2026-01-31', 12, 31, '2027-01-31'],
  ])('advances %s by %i month(s) at anchor %i', (date, months, day, expected) => {
    expect(addMonthsAtAnchor(date, months, day)).toBe(expected)
  })

  it.each([
    ['2026-01-01', 0, 1],
    ['2026-01-01', 4, 1],
    ['2026-01-01', 1, 0],
    ['2026-01-01', 1, 32],
    ['2026-02-30', 1, 30],
  ])('rejects invalid date or schedule (%s, %i, %i)', (date, months, day) => {
    expect(() => addMonthsAtAnchor(date, months, day)).toThrow()
  })
})

describe('classifyDueDate', () => {
  it('marks an unpaid date before today as overdue', () => {
    expect(classifyDueDate('2026-10-03', '2026-10-04', false)).toBe('overdue')
  })

  it('marks today and future dates as upcoming when unpaid', () => {
    expect(classifyDueDate('2026-10-04', '2026-10-04', false)).toBe('upcoming')
    expect(classifyDueDate('2026-11-03', '2026-10-04', false)).toBe('upcoming')
  })

  it('keeps a paid occurrence paid even after its due date', () => {
    expect(classifyDueDate('2026-10-01', '2026-10-04', true)).toBe('paid')
  })
})
