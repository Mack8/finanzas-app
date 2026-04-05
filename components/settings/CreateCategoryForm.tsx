'use client'

import { useActionState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createCategoryAction, type CategoryActionState } from '@/app/(dashboard)/settings/actions'

const initialState: CategoryActionState = {
  status: 'idle',
}

const selectClassName =
  'flex h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50'

export function CreateCategoryForm() {
  const [state, formAction, pending] = useActionState(createCategoryAction, initialState)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.status === 'success') {
      formRef.current?.reset()
    }
  }, [state.status])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nueva categoría</CardTitle>
        <CardDescription>
          Creá categorías personalizadas para ingresos, gastos o ahorro.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="space-y-4">
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
              <select id="type" name="type" className={selectClassName} defaultValue="variable_expense">
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
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                name="color"
                type="color"
                defaultValue="#3b82f6"
                className="h-10 w-full cursor-pointer p-1"
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

          {state.message && (
            <p
              aria-live="polite"
              className={state.status === 'success' ? 'text-sm text-success' : 'text-sm text-danger'}
            >
              {state.message}
            </p>
          )}

          <Button type="submit" disabled={pending}>
            {pending ? 'Guardando...' : 'Crear categoría'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
