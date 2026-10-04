import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ client: { auth: { getUser: vi.fn() }, from: vi.fn() } }))

vi.mock('@/lib/supabase/server', () => ({ createClient: async () => mocks.client }))
vi.mock('@/lib/revalidate', () => ({ revalidateMoneyPaths: vi.fn() }))

import { createSavingsFundAction } from './actions'
import { FINANCIAL_COLOR_PALETTE } from '@/lib/financial-colors'

function makeQuery(result: unknown = { data: null, error: null }) {
  const query: Record<string, ReturnType<typeof vi.fn>> = {}
  for (const method of ['select', 'eq', 'insert']) query[method] = vi.fn(() => query)
  query.then = vi.fn((resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve))
  return query
}

function fundForm(color?: string) {
  const form = new FormData()
  form.set('name', 'Vacaciones')
  form.set('goalAmount', '100000')
  form.set('goalCurrency', 'CRC')
  form.set('targetDate', '2027-01-01')
  if (color !== undefined) form.set('color', color)
  return form
}

describe('savings fund color action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.client.from.mockReset()
    mocks.client.auth.getUser.mockReset()
    mocks.client.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  })

  it('assignsLeastUsedColorWithinUserForSavingsFunds', async () => {
    const usageQuery = makeQuery({ data: [{ color: FINANCIAL_COLOR_PALETTE[0] }], error: null })
    const insertQuery = makeQuery({ error: null })
    mocks.client.from.mockReturnValueOnce(usageQuery).mockReturnValueOnce(insertQuery)

    const result = await createSavingsFundAction({ status: 'idle' }, fundForm())

    expect(result.status).toBe('success')
    expect(usageQuery.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(insertQuery.insert).toHaveBeenCalledWith(expect.objectContaining({ color: FINANCIAL_COLOR_PALETTE[1] }))
  })

  it('rejectsUnsupportedColorBeforeInsert', async () => {
    const insertQuery = makeQuery({ error: null })
    mocks.client.from.mockReturnValue(insertQuery)

    const result = await createSavingsFundAction({ status: 'idle' }, fundForm('#ff00ff'))

    expect(result.status).toBe('error')
    expect(insertQuery.insert).not.toHaveBeenCalled()
  })
})
