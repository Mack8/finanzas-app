import { describe, expect, it } from 'vitest'
import { getTodayCR } from './format'

describe('getTodayCR', () => {
  it.each([
    ['2026-10-04T01:00:00Z', '2026-10-03'],
    ['2026-11-01T02:00:00Z', '2026-10-31'],
    ['2026-11-01T06:00:00Z', '2026-11-01'],
  ])('usa la fecha de Costa Rica para %s', (instant, expected) => {
    expect(getTodayCR(new Date(instant))).toBe(expected)
  })
})
