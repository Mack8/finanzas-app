'use server'

import { getLatestExchangeRate } from '@/lib/bccr/exchange-rate'
import { resolveCategoryForType } from '@/lib/categories-resolve'
import { revalidateMoneyPaths } from '@/lib/revalidate'
import { createClient } from '@/lib/supabase/server'
import { chooseBalancedFinancialColor, isFinancialPaletteColor } from '@/lib/financial-colors'
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
  if (values.color && !isFinancialPaletteColor(values.color)) {
    return {
      status: 'error',
      message: 'Seleccioná un color de la paleta disponible.',
      fieldErrors: { color: ['Seleccioná un color de la paleta disponible.'] },
    }
  }

  let color = values.color || undefined
  if (!color) {
    const { data: fundsWithColors, error: colorsError } = await supabase
      .from('savings_funds')
      .select('color')
      .eq('user_id', user.id)

    if (colorsError) {
      return { status: 'error', message: 'No se pudo asignar un color al fondo.' }
    }
    color = chooseBalancedFinancialColor((fundsWithColors ?? [])
      .map(fund => fund.color)
      .filter((usedColor): usedColor is string => typeof usedColor === 'string'))
  }

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
    color,
    is_active: true,
  })

  if (insertError) return { status: 'error', message: 'No se pudo crear el fondo. Intentá de nuevo.' }

  revalidateMoneyPaths()
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
    .select('id, name, current_amount_crc, goal_amount_crc, is_active')
    .eq('id', fundId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!fund) return { status: 'error', message: 'Fondo no encontrado.' }

  const category = await resolveCategoryForType(
    supabase,
    user.id,
    'savings',
    [fund.name, 'ahorro', 'emergencia'],
  )
  if (!category) {
    return {
      status: 'error',
      message: 'No hay categoría de ahorro activa. Creá una en Configuración.',
    }
  }

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

  // Prefer atomic RPC when migration 004 is applied
  let contributionId: string | null = null
  const { data: rpcRow, error: rpcError } = await supabase.rpc('apply_savings_contribution', {
    p_fund_id: fundId,
    p_user_id: user.id,
    p_date: values.date,
    p_amount: values.amount,
    p_currency: values.currency,
    p_amount_crc: amountCRC,
    p_exchange_rate_id: exchangeRateId,
    p_notes: values.notes || null,
  })

  if (!rpcError && rpcRow) {
    contributionId = (rpcRow as { id: string }).id
  } else {
    // Fallback path (pre-migration or RPC unavailable)
    const { data: contrib, error: insertError } = await supabase
      .from('savings_contributions')
      .insert({
        fund_id: fundId,
        user_id: user.id,
        date: values.date,
        amount: values.amount,
        currency: values.currency,
        amount_crc: amountCRC,
        exchange_rate_id: exchangeRateId,
        notes: values.notes || null,
      })
      .select('id')
      .maybeSingle()

    if (insertError || !contrib) {
      return { status: 'error', message: 'No se pudo registrar el aporte.' }
    }
    contributionId = contrib.id

    const newBalance = fund.current_amount_crc + amountCRC
    const completed = fund.goal_amount_crc > 0 && newBalance >= fund.goal_amount_crc
    const { error: updateError } = await supabase
      .from('savings_funds')
      .update({
        current_amount_crc: newBalance,
        is_active: completed ? false : fund.is_active,
      })
      .eq('id', fundId)
      .eq('user_id', user.id)

    if (updateError) {
      return { status: 'error', message: 'Aporte registrado pero no se pudo actualizar el total del fondo.' }
    }
  }

  // Linked ledger transaction (savings category)
  const { error: txError } = await supabase.from('transactions').insert({
    user_id: user.id,
    date: values.date,
    description: `Aporte · ${fund.name}`,
    amount: values.amount,
    currency: values.currency,
    amount_crc: amountCRC,
    exchange_rate_id: exchangeRateId,
    category_id: category.id,
    transaction_type: 'personal',
    tags: ['savings-contribution'],
    notes: values.notes || null,
    savings_contribution_id: contributionId,
  })

  if (txError) {
    // Retry without link column if migration pending
    if (txError.message?.includes('savings_contribution_id') || txError.code === 'PGRST204') {
      await supabase.from('transactions').insert({
        user_id: user.id,
        date: values.date,
        description: `Aporte · ${fund.name}`,
        amount: values.amount,
        currency: values.currency,
        amount_crc: amountCRC,
        exchange_rate_id: exchangeRateId,
        category_id: category.id,
        transaction_type: 'personal',
        tags: ['savings-contribution'],
        notes: values.notes || `contribution:${contributionId}`,
      })
    }
  }

  revalidateMoneyPaths()
  return { status: 'success', message: 'Aporte registrado en el fondo y en el ledger.' }
}

export async function deleteContributionAction(
  contributionId: string,
  _prevState: DeleteContributionState,
  _formData: FormData
): Promise<DeleteContributionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 'error', message: 'Tu sesión ya no es válida.' }

  const { error: rpcError } = await supabase.rpc('revert_savings_contribution', {
    p_contribution_id: contributionId,
    p_user_id: user.id,
  })

  if (!rpcError) {
    revalidateMoneyPaths()
    return { status: 'success' }
  }

  // Fallback
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

  await supabase
    .from('transactions')
    .delete()
    .eq('savings_contribution_id', contributionId)
    .eq('user_id', user.id)

  const { error: deleteError } = await supabase
    .from('savings_contributions')
    .delete()
    .eq('id', contributionId)
    .eq('user_id', user.id)
  if (deleteError) return { status: 'error', message: 'No se pudo eliminar el aporte.' }

  const newBalance = Math.max(0, fund.current_amount_crc - contribution.amount_crc)
  await supabase
    .from('savings_funds')
    .update({ current_amount_crc: newBalance, is_active: true })
    .eq('id', contribution.fund_id)
    .eq('user_id', user.id)

  revalidateMoneyPaths()
  return { status: 'success' }
}
