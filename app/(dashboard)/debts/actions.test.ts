import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  resolveCategoryForType: vi.fn(),
  revalidateMoneyPaths: vi.fn(),
  updatedDebt: null as Record<string, unknown> | null,
}))

vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }))
vi.mock('@/lib/categories-resolve', () => ({
  resolveCategoryForType: mocks.resolveCategoryForType,
}))
vi.mock('@/lib/revalidate', () => ({ revalidateMoneyPaths: mocks.revalidateMoneyPaths }))

import { markInstallmentPaidAction, setDebtNextDueDateAction } from './actions'

const debt = {
  id: 'debt-1',
  name: 'Préstamo',
  monthly_amount: 25000,
  currency: 'CRC',
  monthly_amount_crc: 25000,
  paid_installments: 2,
  total_installments: 12,
  payment_account_id: null,
  next_due_date: '2026-10-31',
  due_day: 31,
  is_active: true,
}

function fluentQuery(data: unknown) {
  const result = { data, error: null }
  const query: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'insert', 'order']) query[method] = () => query
  query.update = (values: Record<string, unknown>) => {
    mocks.updatedDebt = values
    result.data = [{ id: 'debt-1' }]
    return query
  }
  query.delete = () => {
    result.data = null
    return query
  }
  query.maybeSingle = async () => result
  query.then = (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve)
  return query
}

function configureClient() {
  const rpc = vi.fn().mockResolvedValue({ data: 'transaction-1', error: null })
  mocks.createClient.mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    from: (table: string) => fluentQuery(table === 'debts' ? debt : { id: 'transaction-1' }),
    rpc,
  })
  mocks.resolveCategoryForType.mockResolvedValue({ id: 'category-1' })
  return rpc
}

describe('markInstallmentPaidAction', () => {
  beforeEach(() => vi.clearAllMocks())

  it('settles the current due date through the atomic debt RPC', async () => {
    const rpc = configureClient()
    const formData = new FormData()
    formData.set('scheduledDueDate', '2026-10-31')
    const result = await markInstallmentPaidAction('debt-1', { status: 'idle' }, formData)

    expect(result.status).toBe('success')
    expect(rpc).toHaveBeenCalledWith('pay_debt_installment', expect.objectContaining({
      p_debt_id: 'debt-1',
      p_scheduled_due_date: '2026-10-31',
      p_amount: 25000,
      p_currency: 'CRC',
    }))
  })

  it('rejects replaying a debt payment form after its displayed occurrence changed', async () => {
    const rpc = configureClient()
    const formData = new FormData()
    formData.set('scheduledDueDate', '2026-10-31')
    mocks.createClient.mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
      from: () => fluentQuery({ ...debt, next_due_date: '2026-11-30', due_day: 31 }),
      rpc,
    })

    const result = await markInstallmentPaidAction('debt-1', { status: 'idle' }, formData)

    expect(result.status).toBe('error')
    expect(rpc).not.toHaveBeenCalled()
  })

  it('does not record a legacy debt installment until its due date is configured', async () => {
    const rpc = configureClient()
    mocks.createClient.mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
      from: () => fluentQuery({ ...debt, next_due_date: null, due_day: null }),
      rpc,
    })

    const result = await markInstallmentPaidAction('debt-1', { status: 'idle' }, new FormData())

    expect(result.status).toBe('error')
    expect(result.message).toMatch(/vencimiento/i)
    expect(rpc).not.toHaveBeenCalled()
  })
})

describe('setDebtNextDueDateAction', () => {
  beforeEach(() => vi.clearAllMocks())

  it('configures the next date and anchor without changing the installment count', async () => {
    configureClient()
    const formData = new FormData()
    formData.set('nextDueDate', '2026-11-30')

    const result = await setDebtNextDueDateAction('debt-1', { status: 'idle' }, formData)

    expect(result.status).toBe('success')
    expect(mocks.updatedDebt).toEqual({ next_due_date: '2026-11-30', due_day: 30 })
  })
})
