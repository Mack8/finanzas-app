'use server'

import { getLatestExchangeRate } from '@/lib/bccr/exchange-rate'
import { resolveCategoryForType } from '@/lib/categories-resolve'
import { revalidateMoneyPaths } from '@/lib/revalidate'
import { createClient } from '@/lib/supabase/server'
import { addMonthsAtAnchor } from '@/lib/payment-schedule'
import { resolveAmountCRC, type ExchangeRateSnapshot } from '@/lib/transactions'
import { debtNextDueDateSchema, debtSchema } from '@/lib/validations'

type DebtFieldErrors = Partial<Record<
  'name' | 'monthlyAmount' | 'currency' | 'totalInstallments' | 'startDate' | 'nextDueDate' | 'notes',
  string[]
>>

export type DebtActionState = {
  status: 'idle' | 'error' | 'success'
  message?: string
  fieldErrors?: DebtFieldErrors
}

export type MarkPaidState = {
  status: 'idle' | 'error' | 'success'
  message?: string
}

export type DeleteDebtState = {
  status: 'idle' | 'error' | 'success'
  message?: string
}

function todayCR(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Costa_Rica' }).format(new Date())
}

export async function createDebtAction(
  _prevState: DebtActionState,
  formData: FormData
): Promise<DebtActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 'error', message: 'Tu sesión ya no es válida. Volvé a iniciar sesión.' }

  const parsed = debtSchema.safeParse({
    name: formData.get('name'),
    monthlyAmount: formData.get('monthlyAmount'),
    currency: formData.get('currency'),
    totalInstallments: formData.get('totalInstallments'),
    startDate: formData.get('startDate'),
    nextDueDate: formData.get('nextDueDate'),
    notes: formData.get('notes'),
  })
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Revisá los datos de la deuda.',
      fieldErrors: parsed.error.flatten().fieldErrors as DebtFieldErrors,
    }
  }

  const values = parsed.data
  let latestExchangeRate: ExchangeRateSnapshot | null = null

  if (values.currency === 'USD') {
    try {
      latestExchangeRate = await getLatestExchangeRate({ ensureFresh: true })
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'No se pudo obtener el tipo de cambio.',
      }
    }
  }

  let monthlyAmountCRC: number
  try {
    const resolved = resolveAmountCRC(values.monthlyAmount, values.currency, latestExchangeRate)
    monthlyAmountCRC = resolved.amountCRC
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'No se pudo calcular el monto en colones.',
    }
  }

  const { error: insertError } = await supabase.from('debts').insert({
    user_id: user.id,
    name: values.name,
    monthly_amount: values.monthlyAmount,
    currency: values.currency,
    monthly_amount_crc: monthlyAmountCRC,
    total_installments: values.totalInstallments,
    paid_installments: 0,
    start_date: values.startDate,
    next_due_date: values.nextDueDate,
    due_day: Number(values.nextDueDate.slice(-2)),
    notes: values.notes || null,
    is_active: true,
  })

  if (insertError) return { status: 'error', message: 'No se pudo registrar la deuda. Intentá de nuevo.' }

  revalidateMoneyPaths()
  return { status: 'success', message: 'Deuda registrada correctamente.' }
}

/**
 * Marks one installment paid and creates a linked ledger transaction.
 */
export async function markInstallmentPaidAction(
  id: string,
  _prevState: MarkPaidState,
  _formData: FormData
): Promise<MarkPaidState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 'error', message: 'Tu sesión ya no es válida.' }

  const { data: debtRow } = await supabase
    .from('debts')
    .select('id, name, monthly_amount, currency, paid_installments, total_installments, payment_account_id, next_due_date, due_day, is_active')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!debtRow) return { status: 'error', message: 'Deuda no encontrada.' }
  if (!debtRow.next_due_date || !debtRow.due_day) {
    return { status: 'error', message: 'Configurá la próxima fecha de vencimiento antes de registrar la cuota.' }
  }
  if (!debtRow.is_active || debtRow.paid_installments >= debtRow.total_installments) {
    return { status: 'error', message: 'Esta deuda ya está completamente pagada.' }
  }

  const category = await resolveCategoryForType(
    supabase,
    user.id,
    'fixed_expense',
    ['cuota', 'deuda', 'leasing'],
  )
  if (!category) {
    return {
      status: 'error',
      message: 'No hay categoría de gasto fijo activa (ej. Cuotas). Creá una en Configuración.',
    }
  }

  const installmentNumber = debtRow.paid_installments + 1
  const payDate = todayCR()
  let latestExchangeRate: ExchangeRateSnapshot | null = null
  if (debtRow.currency === 'USD') {
    try {
      latestExchangeRate = await getLatestExchangeRate({ ensureFresh: true })
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : 'No se pudo obtener el tipo de cambio.' }
    }
  }

  let resolvedAmount: ReturnType<typeof resolveAmountCRC>
  try {
    resolvedAmount = resolveAmountCRC(debtRow.monthly_amount, debtRow.currency, latestExchangeRate)
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'No se pudo convertir el monto de la cuota.' }
  }

  const { error: paymentError } = await supabase.rpc('pay_debt_installment', {
    p_debt_id: debtRow.id,
    p_scheduled_due_date: debtRow.next_due_date,
    p_paid_on: payDate,
    p_amount: debtRow.monthly_amount,
    p_amount_crc: resolvedAmount.amountCRC,
    p_currency: debtRow.currency,
    p_exchange_rate_id: resolvedAmount.exchangeRateId,
    p_category_id: category.id,
    p_payment_account_id: debtRow.payment_account_id,
  })

  if (paymentError) {
    return {
      status: 'error',
      message: paymentError.message.includes('transactions_debt_due_unique_idx')
        ? 'Esta cuota ya tiene un pago registrado.'
        : 'No se pudo registrar el pago. Revisá que la fecha no haya cambiado e intentá de nuevo.',
    }
  }

  const isNowComplete = installmentNumber >= debtRow.total_installments

  revalidateMoneyPaths()
  return {
    status: 'success',
    message: isNowComplete
      ? 'Deuda completada y registrada en el ledger. ¡Felicitaciones!'
      : 'Cuota pagada y registrada como transacción.',
  }
}

export async function setDebtNextDueDateAction(
  id: string,
  _prevState: DebtActionState,
  formData: FormData,
): Promise<DebtActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 'error', message: 'Tu sesión ya no es válida. Volvé a iniciar sesión.' }

  const parsed = debtNextDueDateSchema.safeParse({ nextDueDate: formData.get('nextDueDate') })
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Ingresá una fecha de vencimiento válida.',
      fieldErrors: parsed.error.flatten().fieldErrors as DebtFieldErrors,
    }
  }

  const nextDueDate = parsed.data.nextDueDate
  const dueDay = Number(nextDueDate.slice(-2))
  try {
    addMonthsAtAnchor(nextDueDate, 1, dueDay)
  } catch {
    return { status: 'error', message: 'Ingresá una fecha de vencimiento válida.' }
  }

  const { data: updated, error } = await supabase
    .from('debts')
    .update({ next_due_date: nextDueDate, due_day: dueDay })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id')
    .maybeSingle()

  if (error || !updated) return { status: 'error', message: 'No se pudo actualizar el vencimiento de la deuda.' }
  revalidateMoneyPaths()
  return { status: 'success', message: 'Próximo vencimiento configurado.' }
}

export async function deleteDebtAction(
  id: string,
  _prevState: DeleteDebtState,
  _formData: FormData
): Promise<DeleteDebtState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 'error', message: 'Tu sesión ya no es válida.' }

  // Unlink txs before delete (if FK would block)
  await supabase
    .from('transactions')
    .update({ debt_id: null })
    .eq('debt_id', id)
    .eq('user_id', user.id)

  const { error } = await supabase
    .from('debts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { status: 'error', message: 'No se pudo eliminar la deuda.' }

  revalidateMoneyPaths()
  return { status: 'success' }
}
