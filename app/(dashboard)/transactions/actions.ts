'use server'

import { revalidatePath } from 'next/cache'
import { getLatestExchangeRate } from '@/lib/bccr/exchange-rate'
import { createClient } from '@/lib/supabase/server'
import { resolveAmountCRC, type ExchangeRateSnapshot } from '@/lib/transactions'
import { transactionSchema } from '@/lib/validations'

type TransactionFieldErrors = Partial<Record<
  'date' | 'description' | 'amount' | 'currency' | 'categoryId' | 'transactionType' | 'notes',
  string[]
>>

export type TransactionActionState = {
  status: 'idle' | 'error' | 'success'
  message?: string
  fieldErrors?: TransactionFieldErrors
}

export async function createTransactionAction(
  _prevState: TransactionActionState,
  formData: FormData
): Promise<TransactionActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return {
      status: 'error',
      message: 'Tu sesión ya no es válida. Volvé a iniciar sesión.',
    }
  }

  const parsed = transactionSchema.safeParse({
    date: formData.get('date'),
    description: formData.get('description'),
    amount: formData.get('amount'),
    currency: formData.get('currency'),
    categoryId: formData.get('categoryId'),
    transactionType: formData.get('transactionType'),
    notes: formData.get('notes'),
  })

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Revisá los datos del formulario.',
      fieldErrors: parsed.error.flatten().fieldErrors as TransactionFieldErrors,
    }
  }

  const values = parsed.data

  const { data: category, error: categoryError } = await supabase
    .from('categories')
    .select('id')
    .eq('id', values.categoryId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (categoryError || !category) {
    return {
      status: 'error',
      message: 'La categoría seleccionada no es válida para tu cuenta.',
    }
  }

  let latestExchangeRate: ExchangeRateSnapshot | null = null

  if (values.currency === 'USD') {
    try {
      latestExchangeRate = await getLatestExchangeRate({ ensureFresh: true })
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error
          ? error.message
          : 'No se pudo obtener el tipo de cambio actual.',
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

  const { error: insertError } = await supabase.from('transactions').insert({
    user_id: user.id,
    date: values.date,
    description: values.description,
    amount: values.amount,
    currency: values.currency,
    amount_crc: amountCRC,
    exchange_rate_id: exchangeRateId,
    category_id: values.categoryId,
    payment_account_id: null,
    transaction_type: values.transactionType,
    tags: [],
    notes: values.notes || null,
  })

  if (insertError) {
    return {
      status: 'error',
      message: 'No se pudo registrar la transacción. Intentá de nuevo.',
    }
  }

  revalidatePath('/transactions')

  return {
    status: 'success',
    message: 'Transacción registrada correctamente.',
  }
}
