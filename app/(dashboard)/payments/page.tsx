import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import { PaymentsList } from '@/components/payments/PaymentsList'
import { getLatestExchangeRate } from '@/lib/bccr/exchange-rate'
import { classifyDueDate, monthlyDueDatesInWindow } from '@/lib/payment-schedule'
import { getTodayCR } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'
import type { Debt, PaymentAccount, PaymentReminder, RecurringObligation, Transaction } from '@/types/domain'

export default async function PaymentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [debtsResult, obligationsResult, accountsResult, transactionsResult, categoriesResult] = await Promise.all([
    supabase.from('debts')
      .select('id, user_id, name, monthly_amount, currency, monthly_amount_crc, total_installments, paid_installments, start_date, next_due_date, due_day, payment_account_id, notes, is_active, created_at')
      .eq('user_id', user.id),
    supabase.from('recurring_obligations')
      .select('id, user_id, name, notes, expected_amount, currency, expected_amount_crc, category_id, transaction_type, payment_account_id, next_due_date, due_day, interval_months, is_active, created_at, updated_at')
      .eq('user_id', user.id),
    supabase.from('payment_accounts')
      .select('id, user_id, name, type, last_four, bank_name, closing_day, payment_due_day, is_active, created_at')
      .eq('user_id', user.id),
    supabase.from('transactions')
      .select('id, date, amount, currency, payment_account_id, debt_id, recurring_obligation_id, scheduled_due_date')
      .eq('user_id', user.id)
      .not('scheduled_due_date', 'is', null)
      .order('date', { ascending: false })
      .limit(100),
    supabase.from('categories')
      .select('id, name, type')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .in('type', ['fixed_expense', 'variable_expense'])
      .order('sort_order', { ascending: true }),
  ])

  if (debtsResult.error || obligationsResult.error || accountsResult.error || transactionsResult.error || categoriesResult.error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Pagos" description="Cuotas, servicios y próximos vencimientos en un solo lugar." />
        <div role="alert" className="rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          No se pudieron cargar los pagos. Actualizá la página para volver a intentarlo.
        </div>
      </div>
    )
  }

  const debts = (debtsResult.data ?? []) as Debt[]
  const obligations = (obligationsResult.data ?? []) as RecurringObligation[]
  const accounts = (accountsResult.data ?? []) as PaymentAccount[]
  const transactions = (transactionsResult.data ?? []) as Array<Pick<Transaction,
    'id' | 'date' | 'amount' | 'currency' | 'payment_account_id' | 'debt_id' | 'recurring_obligation_id' | 'scheduled_due_date'
  >>
  const categories = categoriesResult.data ?? []
  const today = getTodayCR()
  const reminders: PaymentReminder[] = []
  const debtById = new Map(debts.map(debt => [debt.id, debt]))
  const obligationById = new Map(obligations.map(obligation => [obligation.id, obligation]))

  for (const transaction of transactions) {
    if (!transaction.scheduled_due_date) continue
    if (transaction.debt_id) {
      const debt = debtById.get(transaction.debt_id)
      if (debt) reminders.push({
        id: transaction.id, kind: 'debt', name: debt.name, sourceId: debt.id,
        dueDate: transaction.scheduled_due_date, status: 'paid', amount: transaction.amount,
        currency: transaction.currency, paidOn: transaction.date,
        paymentAccountId: transaction.payment_account_id,
      })
    } else if (transaction.recurring_obligation_id) {
      const obligation = obligationById.get(transaction.recurring_obligation_id)
      if (obligation) reminders.push({
        id: transaction.id, kind: 'recurring', name: obligation.name, sourceId: obligation.id,
        dueDate: transaction.scheduled_due_date, status: 'paid', amount: transaction.amount,
        currency: transaction.currency, paidOn: transaction.date,
        paymentAccountId: transaction.payment_account_id,
      })
    }
  }

  for (const debt of debts.filter(item => item.is_active)) {
    reminders.push({
      id: `debt:${debt.id}:${debt.next_due_date ?? 'unconfigured'}`,
      kind: 'debt', name: debt.name, sourceId: debt.id, dueDate: debt.next_due_date,
      status: debt.next_due_date ? classifyDueDate(debt.next_due_date, today, false) : 'upcoming',
      amount: debt.monthly_amount, currency: debt.currency, paymentAccountId: debt.payment_account_id,
    })
  }

  for (const obligation of obligations.filter(item => item.is_active)) {
    reminders.push({
      id: `recurring:${obligation.id}:${obligation.next_due_date}`,
      kind: 'recurring', name: obligation.name, sourceId: obligation.id,
      dueDate: obligation.next_due_date,
      status: classifyDueDate(obligation.next_due_date, today, false),
      amount: obligation.expected_amount, currency: obligation.currency,
      paymentAccountId: obligation.payment_account_id,
    })
  }

  for (const account of accounts.filter(item => item.is_active && item.type === 'credit_card' && item.payment_due_day)) {
    for (const dueDate of monthlyDueDatesInWindow(today, account.payment_due_day!)) {
      reminders.push({
        id: `card:${account.id}:${dueDate}`, kind: 'card', name: account.name,
        sourceId: account.id, dueDate, status: classifyDueDate(dueDate, today, false),
        amount: null, currency: null, paymentAccountId: account.id,
      })
    }
  }

  let latestExchangeRate: { usd_to_crc: number } | null = null
  try {
    latestExchangeRate = await getLatestExchangeRate({ ensureFresh: true })
  } catch {
    latestExchangeRate = null
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pagos"
        description="Cuotas, servicios y próximos vencimientos en un solo lugar. Los recordatorios de tarjeta no estiman el saldo ni registran una liquidación."
      />
      <PaymentsList
        reminders={reminders}
        debts={debts}
        obligations={obligations}
        categories={categories as Array<{ id: string; name: string; type: 'fixed_expense' | 'variable_expense' }>}
        accounts={accounts.filter(account => account.is_active)}
        latestExchangeRate={latestExchangeRate}
      />
    </div>
  )
}
