'use server'

import { revalidatePath } from 'next/cache'
import { getNextCategorySortOrder } from '@/lib/categories'
import { createClient } from '@/lib/supabase/server'
import { categorySchema } from '@/lib/validations'
import type { CategoryType } from '@/types/database'

type CategoryFieldErrors = Partial<Record<
  'name' | 'type' | 'color' | 'monthlyBudgetAmount' | 'monthlyBudgetCurrency',
  string[]
>>

export type CategoryActionState = {
  status: 'idle' | 'error' | 'success'
  message?: string
  fieldErrors?: CategoryFieldErrors
}

function revalidateCategorySurfaces() {
  revalidatePath('/settings')
  revalidatePath('/transactions')
}

export async function createCategoryAction(
  _prevState: CategoryActionState,
  formData: FormData
): Promise<CategoryActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return {
      status: 'error',
      message: 'Tu sesión ya no es válida. Volvé a iniciar sesión.',
    }
  }

  const parsed = categorySchema.safeParse({
    name: formData.get('name'),
    type: formData.get('type'),
    color: formData.get('color'),
    monthlyBudgetAmount: formData.get('monthlyBudgetAmount'),
    monthlyBudgetCurrency: formData.get('monthlyBudgetCurrency') || undefined,
  })

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Revisá los datos de la categoría.',
      fieldErrors: parsed.error.flatten().fieldErrors as CategoryFieldErrors,
    }
  }

  const values = parsed.data

  const { data: latestCategory, error: sortOrderError } = await supabase
    .from('categories')
    .select('sort_order')
    .eq('user_id', user.id)
    .eq('type', values.type)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (sortOrderError) {
    return {
      status: 'error',
      message: 'No se pudo calcular el orden de la categoría.',
    }
  }

  const { error: insertError } = await supabase.from('categories').insert({
    user_id: user.id,
    name: values.name,
    type: values.type,
    color: values.color,
    icon: null,
    monthly_budget_amount: values.monthlyBudgetAmount ?? null,
    monthly_budget_currency: values.monthlyBudgetCurrency ?? 'CRC',
    is_active: true,
    sort_order: getNextCategorySortOrder(
      values.type as CategoryType,
      latestCategory?.sort_order ?? null
    ),
  })

  if (insertError) {
    return {
      status: 'error',
      message: 'No se pudo crear la categoría. Verificá si ya existe una similar.',
    }
  }

  revalidateCategorySurfaces()

  return {
    status: 'success',
    message: 'Categoría creada correctamente.',
  }
}

export async function toggleCategoryStatusAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const categoryId = String(formData.get('categoryId') ?? '')
  const nextActiveState = String(formData.get('nextActiveState') ?? '') === 'true'

  if (!categoryId) {
    throw new Error('Missing categoryId')
  }

  const { error } = await supabase
    .from('categories')
    .update({ is_active: nextActiveState })
    .eq('id', categoryId)
    .eq('user_id', user.id)

  if (error) {
    throw new Error('No se pudo actualizar el estado de la categoría.')
  }

  revalidateCategorySurfaces()
}

export type UpdateCategoryState = {
  status: 'idle' | 'error' | 'success'
  message?: string
  fieldErrors?: CategoryFieldErrors
}

export type DeleteCategoryState = {
  status: 'idle' | 'error' | 'success'
  message?: string
}

export async function updateCategoryAction(
  id: string,
  _prevState: UpdateCategoryState,
  formData: FormData
): Promise<UpdateCategoryState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 'error', message: 'Tu sesión ya no es válida. Volvé a iniciar sesión.' }

  const parsed = categorySchema.safeParse({
    name: formData.get('name'),
    type: formData.get('type'),
    color: formData.get('color'),
    monthlyBudgetAmount: formData.get('monthlyBudgetAmount'),
    monthlyBudgetCurrency: formData.get('monthlyBudgetCurrency') || undefined,
  })
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Revisá los datos de la categoría.',
      fieldErrors: parsed.error.flatten().fieldErrors as CategoryFieldErrors,
    }
  }

  const values = parsed.data
  const originalType = String(formData.get('originalType') ?? '')

  // If type is changing, block if category has associated transactions
  if (values.type !== originalType) {
    const { count } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id)
      .eq('user_id', user.id)
    if ((count ?? 0) > 0) {
      return {
        status: 'error',
        message: 'No se puede cambiar el tipo porque tiene transacciones asociadas.',
      }
    }
  }

  const { data: updatedRows, error: updateError } = await supabase
    .from('categories')
    .update({
      name: values.name,
      type: values.type,
      color: values.color,
      monthly_budget_amount: values.monthlyBudgetAmount ?? null,
      monthly_budget_currency: values.monthlyBudgetCurrency ?? 'CRC',
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id')

  if (updateError || !updatedRows?.length) {
    return { status: 'error', message: 'No se pudo actualizar la categoría.' }
  }

  revalidateCategorySurfaces()
  return { status: 'success', message: 'Categoría actualizada correctamente.' }
}

export async function deleteCategoryAction(
  id: string,
  _prevState: DeleteCategoryState,
  _formData: FormData
): Promise<DeleteCategoryState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 'error', message: 'Tu sesión ya no es válida.' }

  // Safety check: block delete if category has transactions
  const { count } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', id)
    .eq('user_id', user.id)
  if ((count ?? 0) > 0) {
    return { status: 'error', message: 'No se puede eliminar porque tiene transacciones asociadas.' }
  }

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { status: 'error', message: 'No se pudo eliminar la categoría.' }

  revalidateCategorySurfaces()
  return { status: 'success' }
}
