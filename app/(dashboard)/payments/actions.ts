'use server'

import { getLatestExchangeRate } from '@/lib/bccr/exchange-rate'
import { revalidateMoneyPaths } from '@/lib/revalidate'
import { resolveAmountCRC, type ExchangeRateSnapshot } from '@/lib/transactions'
import { createClient } from '@/lib/supabase/server'
import { recurringObligationSchema, recordObligationPaymentSchema } from '@/lib/validations'

type ObligationFieldErrors = Partial<Record<
  'name' | 'expectedAmount' | 'currency' | 'categoryId' | 'transactionType' |
  'paymentAccountId' | 'nextDueDate' | 'intervalMonths' | 'notes' | 'amount',
  string[]
>>

export type RecurringObligationActionState = {
  status: 'idle' | 'error' | 'success'
  message?: string
  fieldErrors?: ObligationFieldErrors
}

export type RecurringObligationDeleteState = {
  status: 'idle' | 'error' | 'success'
  message?: string
}

async function resolveOwnedExpenseCategory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  categoryId: string,
) {
  const { data } = await supabase
    .from('categories')
    .select('id, type')
    .eq('id', categoryId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()

  if (!data || !['fixed_expense', 'variable_expense'].includes(data.type)) return null
  return data
}

async function resolveOwnedPaymentAccount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  paymentAccountId: string | null,
) {
  if (!paymentAccountId) return true
  const { data } = await supabase
    .from('payment_accounts')
    .select('id')
    .eq('id', paymentAccountId)
    .eq('user_id', userId)
    .maybeSingle()
  return Boolean(data)
}

async function resolveAmount(
  amount: number,
  currency: 'CRC' | 'USD',
): Promise<{ amountCRC: number; exchangeRateId: string | null } | { error: string }> {
  let latestExchangeRate: ExchangeRateSnapshot | null = null
  if (currency === 'USD') {
    try {
      latestExchangeRate = await getLatestExchangeRate({ ensureFresh: true })
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'No se pudo obtener el tipo de cambio.' }
    }
  }
  try {
    return resolveAmountCRC(amount, currency, latestExchangeRate)
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo convertir el monto.' }
  }
}

async function validateObligationValues(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  values: ReturnType<typeof recurringObligationSchema.parse>,
) {
  const category = await resolveOwnedExpenseCategory(supabase, userId, values.categoryId)
  if (!category) return { error: 'La categoría debe ser un gasto activo de tu cuenta.' }

  const paymentAccountId = values.paymentAccountId || null
  if (!await resolveOwnedPaymentAccount(supabase, userId, paymentAccountId)) {
    return { error: 'La cuenta de pago seleccionada no pertenece a tu cuenta.' }
  }

  const amount = await resolveAmount(values.expectedAmount, values.currency)
  if ('error' in amount) return { error: amount.error }

  return { values, paymentAccountId, category, amount }
}

export async function createRecurringObligationAction(
  _prevState: RecurringObligationActionState,
  formData: FormData,
): Promise<RecurringObligationActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 'error', message: 'Tu sesión ya no es válida. Volvé a iniciar sesión.' }

  const parsed = recurringObligationSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return {
      status: 'error', message: 'Revisá los datos del pago recurrente.',
      fieldErrors: parsed.error.flatten().fieldErrors as ObligationFieldErrors,
    }
  }

  const resolved = await validateObligationValues(supabase, user.id, parsed.data)
  if ('error' in resolved) return { status: 'error', message: resolved.error }

  const { error } = await supabase.from('recurring_obligations').insert({
    user_id: user.id,
    name: resolved.values.name,
    notes: resolved.values.notes || null,
    expected_amount: resolved.values.expectedAmount,
    currency: resolved.values.currency,
    expected_amount_crc: resolved.amount.amountCRC,
    category_id: resolved.category.id,
    transaction_type: resolved.values.transactionType,
    payment_account_id: resolved.paymentAccountId,
    next_due_date: resolved.values.nextDueDate,
    due_day: Number(resolved.values.nextDueDate.slice(-2)),
    interval_months: resolved.values.intervalMonths,
    is_active: true,
  })

  if (error) return { status: 'error', message: 'No se pudo registrar el pago recurrente.' }
  revalidateMoneyPaths('/payments')
  return { status: 'success', message: 'Pago recurrente registrado.' }
}

export async function updateRecurringObligationAction(
  id: string,
  _prevState: RecurringObligationActionState,
  formData: FormData,
): Promise<RecurringObligationActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 'error', message: 'Tu sesión ya no es válida. Volvé a iniciar sesión.' }

  const parsed = recurringObligationSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return {
      status: 'error', message: 'Revisá los datos del pago recurrente.',
      fieldErrors: parsed.error.flatten().fieldErrors as ObligationFieldErrors,
    }
  }
  const resolved = await validateObligationValues(supabase, user.id, parsed.data)
  if ('error' in resolved) return { status: 'error', message: resolved.error }

  const { data, error } = await supabase.from('recurring_obligations').update({
    name: resolved.values.name,
    notes: resolved.values.notes || null,
    expected_amount: resolved.values.expectedAmount,
    currency: resolved.values.currency,
    expected_amount_crc: resolved.amount.amountCRC,
    category_id: resolved.category.id,
    transaction_type: resolved.values.transactionType,
    payment_account_id: resolved.paymentAccountId,
    next_due_date: resolved.values.nextDueDate,
    due_day: Number(resolved.values.nextDueDate.slice(-2)),
    interval_months: resolved.values.intervalMonths,
  }).eq('id', id).eq('user_id', user.id).select('id').maybeSingle()

  if (error || !data) return { status: 'error', message: 'No se pudo actualizar el pago recurrente.' }
  revalidateMoneyPaths('/payments')
  return { status: 'success', message: 'Pago recurrente actualizado.' }
}

export async function deactivateRecurringObligationAction(
  id: string,
  _prevState: RecurringObligationDeleteState,
  _formData: FormData,
): Promise<RecurringObligationDeleteState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 'error', message: 'Tu sesión ya no es válida. Volvé a iniciar sesión.' }

  const { data, error } = await supabase.from('recurring_obligations')
    .update({ is_active: false }).eq('id', id).eq('user_id', user.id).select('id').maybeSingle()
  if (error || !data) return { status: 'error', message: 'No se pudo desactivar el pago recurrente.' }

  revalidateMoneyPaths('/payments')
  return { status: 'success', message: 'Pago recurrente desactivado.' }
}

export async function recordRecurringObligationPaymentAction(
  id: string,
  _prevState: RecurringObligationActionState,
  formData: FormData,
): Promise<RecurringObligationActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 'error', message: 'Tu sesión ya no es válida. Volvé a iniciar sesión.' }

  const parsedAmount = recordObligationPaymentSchema.safeParse({ amount: formData.get('amount') })
  if (!parsedAmount.success) {
    return {
      status: 'error', message: 'Ingresá el monto real pagado.',
      fieldErrors: parsedAmount.error.flatten().fieldErrors as ObligationFieldErrors,
    }
  }

  const { data: obligation, error: lookupError } = await supabase.from('recurring_obligations')
    .select('id, name, expected_amount, currency, category_id, transaction_type, payment_account_id, next_due_date, is_active')
    .eq('id', id).eq('user_id', user.id).maybeSingle()
  if (lookupError || !obligation) return { status: 'error', message: 'Pago recurrente no encontrado.' }
  if (!obligation.is_active) return { status: 'error', message: 'Este pago recurrente está inactivo.' }

  const category = await resolveOwnedExpenseCategory(supabase, user.id, obligation.category_id)
  if (!category) return { status: 'error', message: 'La categoría guardada ya no es válida.' }
  if (!await resolveOwnedPaymentAccount(supabase, user.id, obligation.payment_account_id)) {
    return { status: 'error', message: 'La cuenta guardada ya no pertenece a tu cuenta.' }
  }

  const amount = await resolveAmount(parsedAmount.data.amount, obligation.currency)
  if ('error' in amount) return { status: 'error', message: amount.error }
  const paidOn = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Costa_Rica' }).format(new Date())
  const { error } = await supabase.rpc('pay_recurring_obligation', {
    p_obligation_id: obligation.id,
    p_scheduled_due_date: obligation.next_due_date,
    p_paid_on: paidOn,
    p_amount: parsedAmount.data.amount,
    p_amount_crc: amount.amountCRC,
    p_currency: obligation.currency,
    p_exchange_rate_id: amount.exchangeRateId,
    p_category_id: category.id,
    p_payment_account_id: obligation.payment_account_id,
  })

  if (error) {
    return {
      status: 'error',
      message: error.message.includes('transactions_recurring_due_unique_idx')
        ? 'Este vencimiento ya tiene un pago registrado.'
        : 'No se pudo registrar el pago. Revisá que el vencimiento no haya cambiado.',
    }
  }
  revalidateMoneyPaths('/payments')
  return { status: 'success', message: 'Pago registrado en el historial.' }
}
