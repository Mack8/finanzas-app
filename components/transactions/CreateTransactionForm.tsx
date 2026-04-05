'use client'

import { useActionState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createTransactionAction, type TransactionActionState } from '@/app/(dashboard)/transactions/actions'

type CategoryOption = {
  id: string
  name: string
  type: 'fixed_expense' | 'variable_expense' | 'savings' | 'income'
  color: string
}

type ExchangeRateInfo = {
  date: string
  usd_to_crc: number
} | null

type CreateTransactionFormProps = {
  categories: CategoryOption[]
  latestExchangeRate: ExchangeRateInfo
}

const initialState: TransactionActionState = {
  status: 'idle',
}

const selectClassName =
  'flex h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50'

const categoryTypeLabels: Record<CategoryOption['type'], string> = {
  income: 'Ingreso',
  fixed_expense: 'Gasto fijo',
  variable_expense: 'Gasto variable',
  savings: 'Ahorro',
}

export function CreateTransactionForm({
  categories,
  latestExchangeRate,
}: CreateTransactionFormProps) {
  const [state, formAction, pending] = useActionState(createTransactionAction, initialState)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.status === 'success') {
      formRef.current?.reset()
    }
  }, [state.status])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nueva transacción</CardTitle>
        <CardDescription>
          Registrá ingresos, gastos o movimientos personales usando tus categorías actuales.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date">Fecha</Label>
              <Input
                id="date"
                name="date"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                required
              />
              {state.fieldErrors?.date?.[0] && (
                <p className="text-sm text-danger">{state.fieldErrors.date[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Monto</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                required
              />
              {state.fieldErrors?.amount?.[0] && (
                <p className="text-sm text-danger">{state.fieldErrors.amount[0]}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Input
              id="description"
              name="description"
              type="text"
              placeholder="Ej. Supermercado, salario, gasolina"
              required
            />
            {state.fieldErrors?.description?.[0] && (
              <p className="text-sm text-danger">{state.fieldErrors.description[0]}</p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="currency">Moneda</Label>
              <select
                id="currency"
                name="currency"
                className={selectClassName}
                defaultValue="CRC"
                required
              >
                <option value="CRC">CRC</option>
                <option value="USD" disabled={!latestExchangeRate}>
                  USD {!latestExchangeRate ? '(sin tipo de cambio)' : ''}
                </option>
              </select>
              {state.fieldErrors?.currency?.[0] && (
                <p className="text-sm text-danger">{state.fieldErrors.currency[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="transactionType">Tipo</Label>
              <select
                id="transactionType"
                name="transactionType"
                className={selectClassName}
                defaultValue="personal"
                required
              >
                <option value="personal">Personal</option>
                <option value="household">Hogar</option>
                <option value="reimbursement">Reembolso</option>
              </select>
              {state.fieldErrors?.transactionType?.[0] && (
                <p className="text-sm text-danger">{state.fieldErrors.transactionType[0]}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoryId">Categoría</Label>
            <select
              id="categoryId"
              name="categoryId"
              className={selectClassName}
              defaultValue=""
              required
              disabled={categories.length === 0}
            >
              <option value="" disabled>
                {categories.length === 0 ? 'No hay categorías activas' : 'Seleccioná una categoría'}
              </option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {categoryTypeLabels[category.type]} · {category.name}
                </option>
              ))}
            </select>
            {state.fieldErrors?.categoryId?.[0] && (
              <p className="text-sm text-danger">{state.fieldErrors.categoryId[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              className={`${selectClassName} min-h-24 resize-y py-2`}
              placeholder="Opcional"
            />
            {state.fieldErrors?.notes?.[0] && (
              <p className="text-sm text-danger">{state.fieldErrors.notes[0]}</p>
            )}
          </div>

          {latestExchangeRate ? (
            <p className="text-sm text-muted-foreground">
              Tipo de cambio de venta disponible: 1 USD = {latestExchangeRate.usd_to_crc.toFixed(2)} CRC
            </p>
          ) : (
            <p className="text-sm text-warning">
              No hay tipo de cambio cargado en `exchange_rates`. Por ahora solo podés registrar en CRC.
            </p>
          )}

          {state.message && (
            <p
              aria-live="polite"
              className={state.status === 'success' ? 'text-sm text-success' : 'text-sm text-danger'}
            >
              {state.message}
            </p>
          )}

          <Button type="submit" className="w-full md:w-auto" disabled={pending || categories.length === 0}>
            {pending ? 'Guardando...' : 'Guardar transacción'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
