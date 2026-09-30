'use server'

import { getLatestExchangeRate } from '@/lib/bccr/exchange-rate'
import { resolveCategoryForType } from '@/lib/categories-resolve'
import { revalidateMoneyPaths } from '@/lib/revalidate'
import { createClient } from '@/lib/supabase/server'
import { resolveAmountCRC, type ExchangeRateSnapshot } from '@/lib/transactions'
import { debtSchema } from '@/lib/validations'

type DebtFieldErrors = Partial<Record<
  'name' | 'monthlyAmount' | 'currency' | 'totalInstallments' | 'startDate' | 'notes',
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
    .select('id, name, monthly_amount, currency, monthly_amount_crc, paid_installments, total_installments, payment_account_id, is_active')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!debtRow) return { status: 'error', message: 'Deuda no encontrada.' }
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

  // Create ledger entry first so available balance stays consistent
  const { data: txRow, error: txError } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      date: payDate,
      description: `Cuota ${installmentNumber}/${debtRow.total_installments} · ${debtRow.name}`,
      amount: debtRow.monthly_amount,
      currency: debtRow.currency,
      amount_crc: debtRow.monthly_amount_crc,
      category_id: category.id,
      payment_account_id: debtRow.payment_account_id,
      transaction_type: 'personal',
      tags: ['debt-payment'],
      notes: null,
      debt_id: debtRow.id,
    })
    .select('id')
    .maybeSingle()

  if (txError || !txRow) {
    // Fallback if debt_id column not migrated yet
    if (txError?.message?.includes('debt_id') || txError?.code === 'PGRST204') {
      const { data: fallbackTx, error: fallbackErr } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          date: payDate,
          description: `Cuota ${installmentNumber}/${debtRow.total_installments} · ${debtRow.name}`,
          amount: debtRow.monthly_amount,
          currency: debtRow.currency,
          amount_crc: debtRow.monthly_amount_crc,
          category_id: category.id,
          payment_account_id: debtRow.payment_account_id,
          transaction_type: 'personal',
          tags: ['debt-payment'],
          notes: `debt:${debtRow.id}`,
        })
        .select('id')
        .maybeSingle()

      if (fallbackErr || !fallbackTx) {
        return { status: 'error', message: 'No se pudo registrar la transacción de la cuota.' }
      }
    } else {
      return { status: 'error', message: 'No se pudo registrar la transacción de la cuota.' }
    }
  }

  const newPaid = installmentNumber
  const isNowComplete = newPaid >= debtRow.total_installments

  const { data: updatedRows, error } = await supabase
    .from('debts')
    .update({ paid_installments: newPaid, is_active: !isNowComplete })
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('paid_installments', debtRow.paid_installments)
    .select('id')

  if (error || !updatedRows?.length) {
    // Roll back transaction if debt update lost the race
    if (txRow?.id) {
      await supabase.from('transactions').delete().eq('id', txRow.id).eq('user_id', user.id)
    }
    return { status: 'error', message: 'No se pudo registrar el pago. Intentá de nuevo.' }
  }

  revalidateMoneyPaths()
  return {
    status: 'success',
    message: isNowComplete
      ? 'Deuda completada y registrada en el ledger. ¡Felicitaciones!'
      : 'Cuota pagada y registrada como transacción.',
  }
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
