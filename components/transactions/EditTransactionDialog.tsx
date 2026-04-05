'use client'

import { useActionState, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
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
  updateTransactionAction,
  type TransactionActionState,
} from '@/app/(dashboard)/transactions/actions'

type CategoryOption = {
  id: string
  name: string
  type: 'fixed_expense' | 'variable_expense' | 'savings' | 'income'
  color: string
}

type TransactionData = {
  id: string
  date: string
  description: string
  amount: number
  currency: 'CRC' | 'USD'
  transaction_type: 'personal' | 'household' | 'reimbursement'
  notes: string | null
  category: CategoryOption | null
}

type ExchangeRateInfo = {
  date: string
  usd_to_crc: number
} | null

type Props = {
  transaction: TransactionData
  categories: CategoryOption[]
  latestExchangeRate: ExchangeRateInfo
}

const selectClassName =
  'flex h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50'

const categoryTypeLabels: Record<CategoryOption['type'], string> = {
  income: 'Ingreso',
  fixed_expense: 'Gasto fijo',
  variable_expense: 'Gasto variable',
  savings: 'Ahorro',
}

const initialState: TransactionActionState = { status: 'idle' }

export function EditTransactionDialog({ transaction, categories, latestExchangeRate }: Props) {
  const [open, setOpen] = useState(false)
  const boundAction = updateTransactionAction.bind(null, transaction.id)
  const [state, formAction, pending] = useActionState(boundAction, initialState)

  useEffect(() => {
    if (state.status === 'success') {
      setOpen(false)
    }
  }, [state.status])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Editar
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar transacción</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`date-${transaction.id}`}>Fecha</Label>
              <Input
                id={`date-${transaction.id}`}
                name="date"
                type="date"
                defaultValue={transaction.date}
                required
              />
              {state.fieldErrors?.date?.[0] && (
                <p className="text-sm text-danger">{state.fieldErrors.date[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor={`amount-${transaction.id}`}>Monto</Label>
              <Input
                id={`amount-${transaction.id}`}
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue={transaction.amount}
                required
              />
              {state.fieldErrors?.amount?.[0] && (
                <p className="text-sm text-danger">{state.fieldErrors.amount[0]}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`description-${transaction.id}`}>Descripción</Label>
            <Input
              id={`description-${transaction.id}`}
              name="description"
              type="text"
              defaultValue={transaction.description}
              required
            />
            {state.fieldErrors?.description?.[0] && (
              <p className="text-sm text-danger">{state.fieldErrors.description[0]}</p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`currency-${transaction.id}`}>Moneda</Label>
              <select
                id={`currency-${transaction.id}`}
                name="currency"
                className={selectClassName}
                defaultValue={transaction.currency}
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
              <Label htmlFor={`transactionType-${transaction.id}`}>Tipo</Label>
              <select
                id={`transactionType-${transaction.id}`}
                name="transactionType"
                className={selectClassName}
                defaultValue={transaction.transaction_type}
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
            <Label htmlFor={`categoryId-${transaction.id}`}>Categoría</Label>
            <select
              id={`categoryId-${transaction.id}`}
              name="categoryId"
              className={selectClassName}
              defaultValue={transaction.category?.id ?? ''}
              required
              disabled={categories.length === 0}
            >
              <option value="" disabled>
                {categories.length === 0 ? 'No hay categorías activas' : 'Seleccioná una categoría'}
              </option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {categoryTypeLabels[cat.type]} · {cat.name}
                </option>
              ))}
            </select>
            {state.fieldErrors?.categoryId?.[0] && (
              <p className="text-sm text-danger">{state.fieldErrors.categoryId[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`notes-${transaction.id}`}>Notas</Label>
            <textarea
              id={`notes-${transaction.id}`}
              name="notes"
              rows={3}
              className={`${selectClassName} min-h-24 resize-y py-2`}
              defaultValue={transaction.notes ?? ''}
            />
            {state.fieldErrors?.notes?.[0] && (
              <p className="text-sm text-danger">{state.fieldErrors.notes[0]}</p>
            )}
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
