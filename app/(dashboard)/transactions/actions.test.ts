import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), delete: vi.fn() }))

vi.mock('@/lib/bccr/exchange-rate', () => ({ getLatestExchangeRate: vi.fn() }))
vi.mock('@/lib/categories-resolve', () => ({ assertPaymentAccountOwnership: vi.fn() }))
vi.mock('@/lib/merchant-rules', () => ({ ruleToLearn: vi.fn() }))
vi.mock('@/lib/revalidate', () => ({ revalidateMoneyPaths: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }))

import { deleteTransactionAction } from './actions'

function configureTransaction(scheduledDueDate: string | null) {
  mocks.delete.mockResolvedValue({ error: null })
  mocks.createClient.mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    from: () => {
      const query: Record<string, unknown> = {}
      for (const method of ['eq', 'select']) query[method] = () => query
      query.maybeSingle = async () => ({ data: { scheduled_due_date: scheduledDueDate }, error: null })
      query.delete = mocks.delete
      return query
    },
  })
}

describe('deleteTransactionAction', () => {
  beforeEach(() => vi.clearAllMocks())

  it('preserves scheduled payment history instead of orphaning its occurrence', async () => {
    configureTransaction('2026-10-03')

    const result = await deleteTransactionAction('transaction-1', { status: 'idle' }, new FormData())

    expect(result.status).toBe('error')
    expect(result.message).toMatch(/programado/i)
    expect(mocks.delete).not.toHaveBeenCalled()
  })
})
