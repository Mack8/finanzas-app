'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { paymentAccountSchema } from '@/lib/validations'

type AccountFieldErrors = Partial<Record<
  'name' | 'type' | 'lastFour' | 'bankName' | 'closingDay' | 'paymentDueDay',
  string[]
>>

export type AccountActionState = {
  status: 'idle' | 'error' | 'success'
  message?: string
  fieldErrors?: AccountFieldErrors
}

export type DeleteAccountState = {
  status: 'idle' | 'error' | 'success'
  message?: string
}

function parseAccountFormData(formData: FormData) {
  return {
    name: formData.get('name'),
    type: formData.get('type'),
    lastFour: formData.get('lastFour') || undefined,
    bankName: formData.get('bankName') || undefined,
    closingDay: formData.get('closingDay') || undefined,
    paymentDueDay: formData.get('paymentDueDay') || undefined,
  }
}

export async function createPaymentAccountAction(
  _prevState: AccountActionState,
  formData: FormData
): Promise<AccountActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 'error', message: 'Tu sesión ya no es válida. Volvé a iniciar sesión.' }

  const parsed = paymentAccountSchema.safeParse(parseAccountFormData(formData))
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Revisá los datos de la cuenta.',
      fieldErrors: parsed.error.flatten().fieldErrors as AccountFieldErrors,
    }
  }

  const values = parsed.data

  const { error } = await supabase.from('payment_accounts').insert({
    user_id: user.id,
    name: values.name,
    type: values.type,
    last_four: values.lastFour || null,
    bank_name: values.bankName || null,
    closing_day: values.closingDay ?? null,
    payment_due_day: values.paymentDueDay ?? null,
    is_active: true,
  })

  if (error) return { status: 'error', message: 'No se pudo crear la cuenta. Intentá de nuevo.' }

  revalidatePath('/cards')
  return { status: 'success', message: 'Cuenta registrada correctamente.' }
}

export async function updatePaymentAccountAction(
  id: string,
  _prevState: AccountActionState,
  formData: FormData
): Promise<AccountActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 'error', message: 'Tu sesión ya no es válida.' }

  const parsed = paymentAccountSchema.safeParse(parseAccountFormData(formData))
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Revisá los datos de la cuenta.',
      fieldErrors: parsed.error.flatten().fieldErrors as AccountFieldErrors,
    }
  }

  const values = parsed.data

  const { error } = await supabase
    .from('payment_accounts')
    .update({
      name: values.name,
      type: values.type,
      last_four: values.lastFour || null,
      bank_name: values.bankName || null,
      closing_day: values.closingDay ?? null,
      payment_due_day: values.paymentDueDay ?? null,
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { status: 'error', message: 'No se pudo actualizar la cuenta.' }

  revalidatePath('/cards')
  return { status: 'success', message: 'Cuenta actualizada correctamente.' }
}

export async function deletePaymentAccountAction(
  id: string,
  _prevState: DeleteAccountState,
  _formData: FormData
): Promise<DeleteAccountState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 'error', message: 'Tu sesión ya no es válida.' }

  const { count } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('payment_account_id', id)
    .eq('user_id', user.id)
  if ((count ?? 0) > 0) {
    return { status: 'error', message: 'No se puede eliminar porque tiene transacciones asociadas.' }
  }

  const { error } = await supabase
    .from('payment_accounts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { status: 'error', message: 'No se pudo eliminar la cuenta.' }

  revalidatePath('/cards')
  return { status: 'success' }
}
