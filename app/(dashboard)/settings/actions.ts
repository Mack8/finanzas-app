'use server'

import { getNextCategorySortOrder } from '@/lib/categories'
import { revalidateMoneyPaths } from '@/lib/revalidate'
import { createClient } from '@/lib/supabase/server'
import { chooseBalancedFinancialColor, isFinancialPaletteColor } from '@/lib/financial-colors'
import { categorySchema, incomeConfigSchema } from '@/lib/validations'
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
  revalidateMoneyPaths('/settings')
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
    color: formData.get('color') || undefined,
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

  if (values.color && !isFinancialPaletteColor(values.color)) {
    return {
      status: 'error',
      message: 'Seleccioná un color de la paleta disponible.',
      fieldErrors: { color: ['Seleccioná un color de la paleta disponible.'] },
    }
  }

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

  let color = values.color
  if (!color) {
    const { data: categoriesWithColors, error: colorsError } = await supabase
      .from('categories')
      .select('color')
      .eq('user_id', user.id)
      .eq('type', values.type)

    if (colorsError) {
      return { status: 'error', message: 'No se pudo asignar un color a la categoría.' }
    }
    color = chooseBalancedFinancialColor((categoriesWithColors ?? []).map(category => category.color))
  }

  const { error: insertError } = await supabase.from('categories').insert({
    user_id: user.id,
    name: values.name,
    type: values.type,
    color,
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

export type DeleteCategoryState = {
  status: 'idle' | 'error' | 'success'
  message?: string
}

export async function updateCategoryAction(
  id: string,
  _prevState: CategoryActionState,
  formData: FormData
): Promise<CategoryActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 'error', message: 'Tu sesión ya no es válida. Volvé a iniciar sesión.' }

  const parsed = categorySchema.safeParse({
    name: formData.get('name'),
    type: formData.get('type'),
    color: formData.get('color') || undefined,
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

  // Fetch current type from DB to avoid client-supplied originalType bypass
  const { data: currentCategory } = await supabase
    .from('categories')
    .select('type, color')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  const originalType = currentCategory?.type ?? values.type
  const nextColor = values.color ?? currentCategory?.color
  if (!nextColor || (!isFinancialPaletteColor(nextColor) && nextColor !== currentCategory?.color)) {
    return {
      status: 'error',
      message: 'Seleccioná un color de la paleta disponible.',
      fieldErrors: { color: ['Seleccioná un color de la paleta disponible.'] },
    }
  }

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
      color: nextColor,
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

type IncomeConfigFieldErrors = Partial<Record<
  'firstPaymentAmount' | 'firstPaymentDay' | 'secondPaymentAmount' | 'secondPaymentDay' | 'currency' | 'effectiveFrom',
  string[]
>>

export type IncomeConfigState = {
  status: 'idle' | 'error' | 'success'
  message?: string
  fieldErrors?: IncomeConfigFieldErrors
}

export async function saveIncomeConfigAction(
  _prevState: IncomeConfigState,
  formData: FormData
): Promise<IncomeConfigState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 'error', message: 'Tu sesión ya no es válida.' }

  const parsed = incomeConfigSchema.safeParse({
    firstPaymentAmount: formData.get('firstPaymentAmount'),
    firstPaymentDay: formData.get('firstPaymentDay'),
    secondPaymentAmount: formData.get('secondPaymentAmount'),
    secondPaymentDay: formData.get('secondPaymentDay') || undefined,
    currency: formData.get('currency'),
    effectiveFrom: formData.get('effectiveFrom'),
  })
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Revisá los datos del ingreso.',
      fieldErrors: parsed.error.flatten().fieldErrors as IncomeConfigFieldErrors,
    }
  }

  const values = parsed.data

  const { error } = await supabase.from('income_config').insert({
    user_id: user.id,
    first_payment_amount: values.firstPaymentAmount,
    first_payment_day: values.firstPaymentDay,
    second_payment_amount: values.secondPaymentAmount ?? null,
    second_payment_day: values.secondPaymentDay ?? null,
    currency: values.currency,
    effective_from: values.effectiveFrom,
  })

  if (error) return { status: 'error', message: 'No se pudo guardar la configuración de ingresos.' }

  revalidateMoneyPaths('/settings')
  return { status: 'success', message: 'Configuración de ingresos guardada.' }
}
