import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ client: { auth: { getUser: vi.fn() }, from: vi.fn() } }))

vi.mock('@/lib/supabase/server', () => ({ createClient: async () => mocks.client }))
vi.mock('@/lib/revalidate', () => ({ revalidateMoneyPaths: vi.fn() }))

import { createCategoryAction, updateCategoryAction } from './actions'
import { FINANCIAL_COLOR_PALETTE } from '@/lib/financial-colors'

function makeQuery(result: unknown = { data: null, error: null }) {
  const query: Record<string, ReturnType<typeof vi.fn>> = {}
  for (const method of ['select', 'eq', 'order', 'limit', 'update', 'insert']) {
    query[method] = vi.fn(() => query)
  }
  query.maybeSingle = vi.fn(async () => result)
  query.then = vi.fn((resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve))
  return query
}

function categoryForm(color?: string) {
  const form = new FormData()
  form.set('name', 'Salud')
  form.set('type', 'variable_expense')
  if (color !== undefined) form.set('color', color)
  return form
}

describe('category color actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.client.from.mockReset()
    mocks.client.auth.getUser.mockReset()
    mocks.client.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  })

  it('assignsLeastUsedColorWithinUserAndCategoryType', async () => {
    const usageQuery = makeQuery({ data: [{ color: FINANCIAL_COLOR_PALETTE[0] }], error: null })
    const sortQuery = makeQuery({ data: { sort_order: 21 }, error: null })
    const insertQuery = makeQuery({ error: null })
    mocks.client.from.mockImplementation((table: string) => {
      if (table !== 'categories') throw new Error(`Unexpected table ${table}`)
      if (mocks.client.from.mock.calls.filter(([name]) => name === table).length === 1) return sortQuery
      if (mocks.client.from.mock.calls.filter(([name]) => name === table).length === 2) return usageQuery
      return insertQuery
    })

    const result = await createCategoryAction({ status: 'idle' }, categoryForm())

    expect(result.status).toBe('success')
    expect(sortQuery.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(sortQuery.eq).toHaveBeenCalledWith('type', 'variable_expense')
    expect(usageQuery.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(usageQuery.eq).toHaveBeenCalledWith('type', 'variable_expense')
    expect(insertQuery.insert).toHaveBeenCalledWith(expect.objectContaining({ color: FINANCIAL_COLOR_PALETTE[1] }))
  })

  it('rejectsUnsupportedColorBeforeInsert', async () => {
    const sortQuery = makeQuery({ data: null, error: null })
    const usageQuery = makeQuery({ data: [], error: null })
    const insertQuery = makeQuery({ error: null })
    mocks.client.from.mockReturnValueOnce(sortQuery).mockReturnValueOnce(usageQuery).mockReturnValueOnce(insertQuery)

    const result = await createCategoryAction({ status: 'idle' }, categoryForm('#ff00ff'))

    expect(result.status).toBe('error')
    expect(insertQuery.insert).not.toHaveBeenCalled()
  })

  it('preservesUnchangedLegacyCategoryColor', async () => {
    const currentQuery = makeQuery({ data: { type: 'variable_expense', color: '#ff00ff' }, error: null })
    const updateQuery = makeQuery({ data: [{ id: 'category-1' }], error: null })
    mocks.client.from.mockReturnValueOnce(currentQuery).mockReturnValueOnce(updateQuery)

    const result = await updateCategoryAction('category-1', { status: 'idle' }, categoryForm('#ff00ff'))

    expect(result.status).toBe('success')
    expect(updateQuery.update).toHaveBeenCalledWith(expect.objectContaining({ color: '#ff00ff' }))
  })

  it('rejectsChangingCategoryToUnsupportedColor', async () => {
    const currentQuery = makeQuery({ data: { type: 'variable_expense', color: '#22c55e' }, error: null })
    mocks.client.from.mockReturnValueOnce(currentQuery)

    const result = await updateCategoryAction('category-1', { status: 'idle' }, categoryForm('#ff00ff'))

    expect(result.status).toBe('error')
    expect(mocks.client.from).toHaveBeenCalledTimes(1)
  })
})
