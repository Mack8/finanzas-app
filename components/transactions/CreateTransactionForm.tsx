'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'
import { useFormDialogControls } from '@/components/layout/form-dialog-context'
import { useActionStateFormSubmit, useClosingActionState } from '@/components/ui/use-closing-action-state'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getTodayCR } from '@/lib/format'
import { createTransactionAction, type TransactionActionState } from '@/app/(dashboard)/transactions/actions'

type CategoryOption = {
  id: string
  name: string
  type: 'fixed_expense' | 'variable_expense' | 'savings' | 'income'
  color: string
}

type AccountOption = {
  id: string
  name: string
  type: 'credit_card' | 'bank_account'
  last_four: string | null
}

type ExchangeRateInfo = {
  date: string
  usd_to_crc: number
} | null

type CreateTransactionFormProps = {
  categories: CategoryOption[]
  latestExchangeRate: ExchangeRateInfo
  accounts: AccountOption[]
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
  accounts,
}: CreateTransactionFormProps) {
  const { setOpen, setPending } = useFormDialogControls()
  const [state, formAction, pending] = useClosingActionState(createTransactionAction, initialState, setOpen)
  const handleSubmit = useActionStateFormSubmit(formAction)
  useEffect(() => setPending(pending), [pending, setPending])

  return (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date">Fecha</Label>
              <Input
                id="date"
                name="date"
                type="date"
                defaultValue={getTodayCR()}
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
              <Label htmlFor="transactionType">Ámbito</Label>
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

          {accounts.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="paymentAccountId">Cuenta (opcional)</Label>
              <select
                id="paymentAccountId"
                name="paymentAccountId"
                className={selectClassName}
                defaultValue=""
              >
                <option value="">Sin cuenta</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}{acc.last_four ? ` ····${acc.last_four}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {latestExchangeRate ? (
            <p className="text-sm text-muted-foreground">
              Tipo de cambio de venta disponible: 1 USD = {latestExchangeRate.usd_to_crc.toFixed(2)} CRC
            </p>
          ) : (
            <p className="text-sm text-warning">
              No hay tipo de cambio disponible. Por ahora podés registrar en colones.
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

          <DialogFooter>
            <Button type="submit" className="w-full sm:w-auto" disabled={pending || categories.length === 0}>
              {pending ? 'Guardando...' : 'Guardar transacción'}
            </Button>
          </DialogFooter>
        </form>
  )
}
