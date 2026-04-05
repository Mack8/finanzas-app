'use server'

import { revalidatePath } from 'next/cache'
import { getLatestExchangeRate } from '@/lib/bccr/exchange-rate'
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
    is_active: true,
  })

  if (insertError) return { status: 'error', message: 'No se pudo registrar la deuda. Intentá de nuevo.' }

  revalidatePath('/debts')
  return { status: 'success', message: 'Deuda registrada correctamente.' }
}

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
    .select('paid_installments, total_installments')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!debtRow) return { status: 'error', message: 'Deuda no encontrada.' }
  if (debtRow.paid_installments >= debtRow.total_installments) {
    return { status: 'error', message: 'Esta deuda ya está completamente pagada.' }
  }

  const newPaid = debtRow.paid_installments + 1
  const isNowComplete = newPaid >= debtRow.total_installments

  // Guard in WHERE clause: only update if still unpaid — prevents double-increment on rapid clicks
  const { data: updatedRows, error } = await supabase
    .from('debts')
    .update({ paid_installments: newPaid, is_active: !isNowComplete })
    .eq('id', id)
    .eq('user_id', user.id)
    .lt('paid_installments', debtRow.total_installments)
    .select('id')

  if (error || !updatedRows?.length) return { status: 'error', message: 'No se pudo registrar el pago. Intentá de nuevo.' }

  revalidatePath('/debts')
  return {
    status: 'success',
    message: isNowComplete ? 'Deuda completada. ¡Felicitaciones!' : 'Cuota marcada como pagada.',
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

  const { error } = await supabase
    .from('debts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { status: 'error', message: 'No se pudo eliminar la deuda.' }

  revalidatePath('/debts')
  return { status: 'success' }
}
