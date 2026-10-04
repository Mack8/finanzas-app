'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useClosingActionState } from '@/components/ui/use-closing-action-state'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  updateCategoryAction,
  type CategoryActionState,
} from '@/app/(dashboard)/settings/actions'

type CategoryData = {
  id: string
  name: string
  type: 'fixed_expense' | 'variable_expense' | 'savings' | 'income'
  color: string
  monthly_budget_amount: number | null
  monthly_budget_currency: string
}

const selectClassName =
  'flex h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50'

const initialState: CategoryActionState = { status: 'idle' }

export function EditCategoryDialog({ category }: { category: CategoryData }) {
  const [open, setOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)

  const boundAction = useMemo(
    () => updateCategoryAction.bind(null, category.id),
    [category.id]
  )
  const [state, formAction, pending] = useClosingActionState(boundAction, initialState, setOpen)

  function handleOpenChange(next: boolean) {
    if (!next) setFormKey(k => k + 1)
    setOpen(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger disabled={pending} render={<Button variant="outline" size="sm" />}>
        Editar
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar categoría</DialogTitle>
        </DialogHeader>
        <form key={formKey} action={formAction} className="space-y-4">

          <div className="space-y-2">
            <Label htmlFor={`cat-name-${category.id}`}>Nombre</Label>
            <Input
              id={`cat-name-${category.id}`}
              name="name"
              type="text"
              defaultValue={category.name}
              required
            />
            {state.fieldErrors?.name?.[0] && (
              <p className="text-sm text-danger">{state.fieldErrors.name[0]}</p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_140px]">
            <div className="space-y-2">
              <Label htmlFor={`cat-type-${category.id}`}>Tipo</Label>
              <select
                id={`cat-type-${category.id}`}
                name="type"
                className={selectClassName}
                defaultValue={category.type}
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
              <Label htmlFor={`cat-color-${category.id}`}>Color</Label>
              <Input
                id={`cat-color-${category.id}`}
                name="color"
                type="color"
                defaultValue={category.color}
                className="h-10 w-full cursor-pointer p-1"
              />
              {state.fieldErrors?.color?.[0] && (
                <p className="text-sm text-danger">{state.fieldErrors.color[0]}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_120px]">
            <div className="space-y-2">
              <Label htmlFor={`cat-budget-${category.id}`}>Presupuesto mensual</Label>
              <Input
                id={`cat-budget-${category.id}`}
                name="monthlyBudgetAmount"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue={category.monthly_budget_amount ?? ''}
                placeholder="Opcional"
              />
              {state.fieldErrors?.monthlyBudgetAmount?.[0] && (
                <p className="text-sm text-danger">{state.fieldErrors.monthlyBudgetAmount[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor={`cat-budgetcurrency-${category.id}`}>Moneda</Label>
              <select
                id={`cat-budgetcurrency-${category.id}`}
                name="monthlyBudgetCurrency"
                className={selectClassName}
                defaultValue={category.monthly_budget_currency}
              >
                <option value="CRC">CRC</option>
                <option value="USD">USD</option>
              </select>
              {state.fieldErrors?.monthlyBudgetCurrency?.[0] && (
                <p className="text-sm text-danger">{state.fieldErrors.monthlyBudgetCurrency[0]}</p>
              )}
            </div>
          </div>

          {state.message && (
            <p
              aria-live="polite"
              className={state.status === 'success' ? 'text-sm text-success' : 'text-sm text-danger'}
            >
              {state.message}
            </p>
          )}

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={pending}>
              {pending ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
