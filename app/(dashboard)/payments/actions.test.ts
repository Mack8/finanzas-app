import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getLatestExchangeRate: vi.fn(),
  inserts: [] as Array<{ table: string; value: Record<string, unknown> }>,
  updates: [] as Array<{ table: string; value: Record<string, unknown> }>,
  rpc: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }))
vi.mock('@/lib/bccr/exchange-rate', () => ({ getLatestExchangeRate: mocks.getLatestExchangeRate }))
vi.mock('@/lib/revalidate', () => ({ revalidateMoneyPaths: vi.fn() }))

import {
  createRecurringObligationAction,
  deactivateRecurringObligationAction,
  recordRecurringObligationPaymentAction,
  updateRecurringObligationAction,
} from './actions'

const obligation = {
  id: 'obligation-1',
  user_id: 'user-1',
  name: 'Internet',
  notes: null,
  expected_amount: 25000,
  currency: 'CRC',
  expected_amount_crc: 25000,
  category_id: '550e8400-e29b-41d4-a716-446655440000',
  transaction_type: 'personal',
  payment_account_id: null,
  next_due_date: '2026-10-03',
  due_day: 3,
  interval_months: 1,
  is_active: true,
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
}

function configureClient(overrides: { category?: unknown; obligation?: unknown } = {}) {
  mocks.inserts.length = 0
  mocks.updates.length = 0
  mocks.rpc.mockResolvedValue({ data: 'transaction-1', error: null })
  mocks.getLatestExchangeRate.mockResolvedValue({ id: 'rate-1', date: '2026-10-01', usd_to_crc: 510 })
  mocks.createClient.mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    rpc: mocks.rpc,
    from(table: string) {
      let value: Record<string, unknown> | null = null
      const query: Record<string, unknown> = {}
      for (const method of ['select', 'eq', 'order']) query[method] = () => query
      query.insert = (insert: Record<string, unknown>) => {
        mocks.inserts.push({ table, value: insert })
        value = insert
        return query
      }
      query.update = (update: Record<string, unknown>) => {
        mocks.updates.push({ table, value: update })
        value = { ...obligation, ...update }
        return query
      }
      query.maybeSingle = async () => ({
        data: table === 'recurring_obligations'
          ? overrides.obligation ?? obligation
          : table === 'categories'
            ? Object.hasOwn(overrides, 'category') ? overrides.category : { id: obligation.category_id, type: 'fixed_expense' }
            : null,
        error: null,
      })
      query.then = (resolve: (value: { data: unknown; error: null }) => unknown) =>
        Promise.resolve({ data: value, error: null }).then(resolve)
      return query
    },
  })
}

function obligationForm(overrides: Record<string, string> = {}) {
  const formData = new FormData()
  for (const [key, value] of Object.entries({
    name: 'Internet',
    expectedAmount: '25000',
    currency: 'CRC',
    categoryId: obligation.category_id,
    transactionType: 'personal',
    paymentAccountId: '',
    nextDueDate: '2026-10-03',
    intervalMonths: '1',
    notes: '',
    ...overrides,
  })) formData.set(key, value)
  return formData
}

describe('recurring obligation actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    configureClient()
  })

  it('creates an obligation with an anchor matching its due date', async () => {
    const result = await createRecurringObligationAction({ status: 'idle' }, obligationForm())
    expect(result.status).toBe('success')
    expect(mocks.inserts[0]).toMatchObject({
      table: 'recurring_obligations',
      value: { user_id: 'user-1', expected_amount: 25000, expected_amount_crc: 25000, due_day: 3, interval_months: 1 },
    })
  })

  it('rejects a category that does not belong to this user', async () => {
    configureClient({ category: null })
    const result = await createRecurringObligationAction({ status: 'idle' }, obligationForm())
    expect(result.status).toBe('error')
    expect(mocks.inserts).toHaveLength(0)
  })

  it('updates an obligation only with validated recurrence fields', async () => {
    const result = await updateRecurringObligationAction('obligation-1', { status: 'idle' }, obligationForm({ intervalMonths: '3', nextDueDate: '2026-12-31' }))
    expect(result.status).toBe('success')
    expect(mocks.updates[0]).toMatchObject({ table: 'recurring_obligations', value: { interval_months: 3, next_due_date: '2026-12-31', due_day: 31 } })
  })

  it('deactivates an owned obligation', async () => {
    const result = await deactivateRecurringObligationAction('obligation-1', { status: 'idle' }, new FormData())
    expect(result.status).toBe('success')
    expect(mocks.updates[0]).toEqual({ table: 'recurring_obligations', value: { is_active: false } })
  })

  it('records the actual variable amount against the current overdue occurrence', async () => {
    const formData = new FormData()
    formData.set('amount', '23750')
    const result = await recordRecurringObligationPaymentAction('obligation-1', { status: 'idle' }, formData)
    expect(result.status).toBe('success')
    expect(mocks.rpc).toHaveBeenCalledWith('pay_recurring_obligation', expect.objectContaining({
      p_obligation_id: 'obligation-1',
      p_scheduled_due_date: '2026-10-03',
      p_amount: 23750,
      p_amount_crc: 23750,
      p_currency: 'CRC',
    }))
  })

  it('rejects a non-positive payment before creating a transaction', async () => {
    const formData = new FormData()
    formData.set('amount', '0')
    const result = await recordRecurringObligationPaymentAction('obligation-1', { status: 'idle' }, formData)
    expect(result.status).toBe('error')
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
})
