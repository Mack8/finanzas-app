import { describe, expect, it } from 'vitest'
import { getNextCategorySortOrder } from './categories'

describe('getNextCategorySortOrder', () => {
  it('uses the seed base when there are no categories of that type yet', () => {
    expect(getNextCategorySortOrder('income', null)).toBe(0)
    expect(getNextCategorySortOrder('fixed_expense', null)).toBe(10)
    expect(getNextCategorySortOrder('variable_expense', null)).toBe(20)
    expect(getNextCategorySortOrder('savings', null)).toBe(30)
  })

  it('appends after the latest sort order for the same type', () => {
    expect(getNextCategorySortOrder('variable_expense', 25)).toBe(26)
  })
})
