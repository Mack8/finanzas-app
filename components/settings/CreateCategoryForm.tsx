'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createCategoryAction, type CategoryActionState } from '@/app/(dashboard)/settings/actions'
import { useFormDialogControls } from '@/components/layout/form-dialog-context'
import { FINANCIAL_COLOR_PALETTE, type FinancialPaletteColor } from '@/lib/financial-colors'
import { PaletteColorField } from '@/components/ui/PaletteColorField'
import { useActionStateFormSubmit, useClosingActionState } from '@/components/ui/use-closing-action-state'
import type { CategoryType } from '@/types/database'

const initialState: CategoryActionState = {
  status: 'idle',
}

const selectClassName =
  'flex h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50'

export type SuggestedCategoryColors = Record<CategoryType, FinancialPaletteColor>

export function CreateCategoryForm({ suggestedColors }: { suggestedColors: SuggestedCategoryColors }) {
  const { setOpen, setPending } = useFormDialogControls()
  const [state, formAction, pending] = useClosingActionState(createCategoryAction, initialState, setOpen)
  const handleSubmit = useActionStateFormSubmit(formAction)
  const [categoryType, setCategoryType] = useState<CategoryType>('variable_expense')
  const [color, setColor] = useState<FinancialPaletteColor>(suggestedColors.variable_expense)
  const manuallySelectedColor = useRef(false)
  useEffect(() => setPending(pending), [pending, setPending])

  return (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Ej. Mascotas, Freelance, Educación"
              required
            />
            {state.fieldErrors?.name?.[0] && (
              <p className="text-sm text-danger">{state.fieldErrors.name[0]}</p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_140px]">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <select
                id="type"
                name="type"
                className={selectClassName}
                value={categoryType}
                onChange={event => {
                  const nextType = event.target.value as CategoryType
                  setCategoryType(nextType)
                  if (!manuallySelectedColor.current) setColor(suggestedColors[nextType])
                }}
              >
                <option value="income">Ingreso</option>
                <option value="fixed_expense">Gasto fijo</option>
                <option value="variable_expense">Gasto variable</option>
                <option value="savings">Ahorro</option>
              </select>
              {state.fieldErrors?.type?.[0] && (
                <p className="text-sm text-danger">{state.fieldErrors.type[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-color">Color</Label>
              <PaletteColorField
                id="category-color"
                name="color"
                value={color}
                onValueChange={nextColor => {
                  manuallySelectedColor.current = true
                  setColor(nextColor as FinancialPaletteColor)
                }}
                options={FINANCIAL_COLOR_PALETTE}
              />
              {state.fieldErrors?.color?.[0] && (
                <p className="text-sm text-danger">{state.fieldErrors.color[0]}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_120px]">
            <div className="space-y-2">
              <Label htmlFor="monthlyBudgetAmount">Presupuesto mensual</Label>
              <Input
                id="monthlyBudgetAmount"
                name="monthlyBudgetAmount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="Opcional"
              />
              {state.fieldErrors?.monthlyBudgetAmount?.[0] && (
                <p className="text-sm text-danger">{state.fieldErrors.monthlyBudgetAmount[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthlyBudgetCurrency">Moneda</Label>
              <select
                id="monthlyBudgetCurrency"
                name="monthlyBudgetCurrency"
                className={selectClassName}
                defaultValue="CRC"
              >
                <option value="CRC">CRC</option>
                <option value="USD">USD</option>
              </select>
              {state.fieldErrors?.monthlyBudgetCurrency?.[0] && (
                <p className="text-sm text-danger">{state.fieldErrors.monthlyBudgetCurrency[0]}</p>
              )}
            </div>
          </div>

          {state.status === 'error' && state.message && (
            <p
              aria-live="polite"
              className="text-sm text-danger"
            >
              {state.message}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
              {pending ? 'Guardando...' : 'Crear categoría'}
            </Button>
          </DialogFooter>
        </form>
  )
}
