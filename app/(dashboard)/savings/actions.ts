'use server'

import { revalidatePath } from 'next/cache'
import { getLatestExchangeRate } from '@/lib/bccr/exchange-rate'
import { createClient } from '@/lib/supabase/server'
import { resolveAmountCRC, type ExchangeRateSnapshot } from '@/lib/transactions'
import { contributionSchema, savingsFundSchema } from '@/lib/validations'

type FundFieldErrors = Partial<Record<
  'name' | 'goalAmount' | 'goalCurrency' | 'targetDate' | 'color' | 'monthlyContributionAmount' | 'monthlyContributionCurrency',
  string[]
>>

export type FundActionState = {
  status: 'idle' | 'error' | 'success'
  message?: string
  fieldErrors?: FundFieldErrors
}

type ContributionFieldErrors = Partial<Record<'date' | 'amount' | 'currency' | 'notes', string[]>>

export type ContributionActionState = {
  status: 'idle' | 'error' | 'success'
  message?: string
  fieldErrors?: ContributionFieldErrors
}

export type DeleteContributionState = {
  status: 'idle' | 'error' | 'success'
  message?: string
}

export async function createSavingsFundAction(
  _prevState: FundActionState,
  formData: FormData
): Promise<FundActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 'error', message: 'Tu sesión ya no es válida. Volvé a iniciar sesión.' }

  const parsed = savingsFundSchema.safeParse({
    name: formData.get('name'),
    goalAmount: formData.get('goalAmount'),
    goalCurrency: formData.get('goalCurrency'),
    targetDate: formData.get('targetDate'),
    color: formData.get('color') || undefined,
    monthlyContributionAmount: formData.get('monthlyContributionAmount'),
    monthlyContributionCurrency: formData.get('monthlyContributionCurrency') || undefined,
  })
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Revisá los datos del fondo.',
      fieldErrors: parsed.error.flatten().fieldErrors as FundFieldErrors,
    }
  }

  const values = parsed.data
  let latestExchangeRate: ExchangeRateSnapshot | null = null

  if (values.goalCurrency === 'USD') {
    try {
      latestExchangeRate = await getLatestExchangeRate({ ensureFresh: true })
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'No se pudo obtener el tipo de cambio.',
      }
    }
  }

  let goalAmountCRC: number
  try {
    const resolved = resolveAmountCRC(values.goalAmount, values.goalCurrency, latestExchangeRate)
    goalAmountCRC = resolved.amountCRC
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'No se pudo calcular la meta en colones.',
    }
  }

  const { error: insertError } = await supabase.from('savings_funds').insert({
    user_id: user.id,
    name: values.name,
    goal_amount: values.goalAmount,
    goal_currency: values.goalCurrency,
    goal_amount_crc: goalAmountCRC,
    current_amount_crc: 0,
    target_date: values.targetDate,
    monthly_contribution_amount: values.monthlyContributionAmount ?? null,
    monthly_contribution_currency: values.monthlyContributionCurrency ?? null,
    color: values.color || '#3b82f6',
    is_active: true,
  })

  if (insertError) return { status: 'error', message: 'No se pudo crear el fondo. Intentá de nuevo.' }

  revalidatePath('/savings')
  return { status: 'success', message: 'Fondo de ahorro creado correctamente.' }
}

export async function addContributionAction(
  fundId: string,
  _prevState: ContributionActionState,
  formData: FormData
): Promise<ContributionActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 'error', message: 'Tu sesión ya no es válida.' }

  const parsed = contributionSchema.safeParse({
    date: formData.get('date'),
    amount: formData.get('amount'),
    currency: formData.get('currency'),
    notes: formData.get('notes'),
  })
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Revisá los datos del aporte.',
      fieldErrors: parsed.error.flatten().fieldErrors as ContributionFieldErrors,
    }
  }

  const values = parsed.data

  const { data: fund } = await supabase
    .from('savings_funds')
    .select('id, current_amount_crc')
    .eq('id', fundId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!fund) return { status: 'error', message: 'Fondo no encontrado.' }

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

  let amountCRC: number
  let exchangeRateId: string | null
  try {
    const resolved = resolveAmountCRC(values.amount, values.currency, latestExchangeRate)
    amountCRC = resolved.amountCRC
    exchangeRateId = resolved.exchangeRateId
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'No se pudo calcular el monto en colones.',
    }
  }

  const { error: insertError } = await supabase.from('savings_contributions').insert({
    fund_id: fundId,
    user_id: user.id,
    date: values.date,
    amount: values.amount,
    currency: values.currency,
    amount_crc: amountCRC,
    exchange_rate_id: exchangeRateId,
    notes: values.notes || null,
  })
  if (insertError) return { status: 'error', message: 'No se pudo registrar el aporte.' }

  const { error: updateError } = await supabase
    .from('savings_funds')
    .update({ current_amount_crc: fund.current_amount_crc + amountCRC })
    .eq('id', fundId)
    .eq('user_id', user.id)
  if (updateError) return { status: 'error', message: 'Aporte registrado pero no se pudo actualizar el total del fondo.' }

  revalidatePath('/savings')
  return { status: 'success', message: 'Aporte registrado correctamente.' }
}

export async function deleteContributionAction(
  contributionId: string,
  _prevState: DeleteContributionState,
  _formData: FormData
): Promise<DeleteContributionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 'error', message: 'Tu sesión ya no es válida.' }

  const { data: contribution } = await supabase
    .from('savings_contributions')
    .select('amount_crc, fund_id')
    .eq('id', contributionId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!contribution) return { status: 'error', message: 'Aporte no encontrado.' }

  const { data: fund } = await supabase
    .from('savings_funds')
    .select('current_amount_crc')
    .eq('id', contribution.fund_id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!fund) return { status: 'error', message: 'Fondo no encontrado.' }

  const { error: deleteError } = await supabase
    .from('savings_contributions')
    .delete()
    .eq('id', contributionId)
    .eq('user_id', user.id)
  if (deleteError) return { status: 'error', message: 'No se pudo eliminar el aporte.' }

  const newBalance = Math.max(0, fund.current_amount_crc - contribution.amount_crc)
  const { error: updateError } = await supabase
    .from('savings_funds')
    .update({ current_amount_crc: newBalance })
    .eq('id', contribution.fund_id)
    .eq('user_id', user.id)
  if (updateError) return { status: 'error', message: 'Aporte eliminado pero no se pudo actualizar el total del fondo.' }

  revalidatePath('/savings')
  return { status: 'success' }
}
