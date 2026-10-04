'use client'

import { useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'
import { useFormDialogControls } from '@/components/layout/form-dialog-context'
import { useActionStateFormSubmit, useClosingActionState } from '@/components/ui/use-closing-action-state'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  createRecurringObligationAction,
  updateRecurringObligationAction,
  type RecurringObligationActionState,
} from '@/app/(dashboard)/payments/actions'
import type { RecurringObligation } from '@/types/domain'

type Props = {
  categories: Array<{ id: string; name: string; type: 'fixed_expense' | 'variable_expense' }>
  accounts: Array<{ id: string; name: string; last_four: string | null }>
  latestExchangeRate: { usd_to_crc: number } | null
  obligation?: RecurringObligation
}

const initialState: RecurringObligationActionState = { status: 'idle' }
const selectClassName = 'flex h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50'

export function CreateObligationForm({ categories, accounts, latestExchangeRate, obligation }: Props) {
  const { setOpen, setPending } = useFormDialogControls()
  const action = useMemo(
    () => obligation ? updateRecurringObligationAction.bind(null, obligation.id) : createRecurringObligationAction,
    [obligation],
  )
  const [state, formAction, pending] = useClosingActionState(action, initialState, setOpen)
  const handleSubmit = useActionStateFormSubmit(formAction)
  useEffect(() => setPending(pending), [pending, setPending])

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="obligation-name">Nombre</Label>
        <Input id="obligation-name" name="name" placeholder="Ej. Internet, electricidad" defaultValue={obligation?.name} required maxLength={80} />
        {state.fieldErrors?.name?.[0] && <p className="text-sm text-danger">{state.fieldErrors.name[0]}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="obligation-amount">Monto esperado</Label>
          <Input id="obligation-amount" name="expectedAmount" type="number" min="0.01" step="0.01" defaultValue={obligation?.expected_amount} required />
          {state.fieldErrors?.expectedAmount?.[0] && <p className="text-sm text-danger">{state.fieldErrors.expectedAmount[0]}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="obligation-currency">Moneda</Label>
          <select id="obligation-currency" name="currency" className={selectClassName} defaultValue={obligation?.currency ?? 'CRC'}>
            <option value="CRC">CRC</option>
            <option value="USD" disabled={!latestExchangeRate}>USD {!latestExchangeRate ? '(sin TC)' : ''}</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="obligation-next-due">Próximo vencimiento</Label>
          <Input id="obligation-next-due" name="nextDueDate" type="date" defaultValue={obligation?.next_due_date} required />
          {state.fieldErrors?.nextDueDate?.[0] && <p className="text-sm text-danger">{state.fieldErrors.nextDueDate[0]}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="obligation-interval">Frecuencia</Label>
          <select id="obligation-interval" name="intervalMonths" className={selectClassName} defaultValue={String(obligation?.interval_months ?? 1)}>
            <option value="1">Cada mes</option>
            <option value="2">Cada 2 meses</option>
            <option value="3">Cada 3 meses</option>
            <option value="6">Cada 6 meses</option>
            <option value="12">Cada año</option>
          </select>
          {state.fieldErrors?.intervalMonths?.[0] && <p className="text-sm text-danger">{state.fieldErrors.intervalMonths[0]}</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="obligation-category">Categoría</Label>
          <select id="obligation-category" name="categoryId" className={selectClassName} defaultValue={obligation?.category_id ?? ''} required disabled={!categories.length}>
            <option value="" disabled>{categories.length ? 'Seleccioná una categoría' : 'No hay gastos activos'}</option>
            {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          {state.fieldErrors?.categoryId?.[0] && <p className="text-sm text-danger">{state.fieldErrors.categoryId[0]}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="obligation-account">Cuenta de pago</Label>
          <select id="obligation-account" name="paymentAccountId" className={selectClassName} defaultValue={obligation?.payment_account_id ?? ''}>
            <option value="">Sin cuenta asignada</option>
            {accounts.map(account => <option key={account.id} value={account.id}>{account.name}{account.last_four ? ` ···· ${account.last_four}` : ''}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="obligation-transaction-type">Ámbito</Label>
        <select id="obligation-transaction-type" name="transactionType" className={selectClassName} defaultValue={obligation?.transaction_type ?? 'personal'}>
          <option value="personal">Personal</option>
          <option value="household">Hogar</option>
          <option value="reimbursement">Reembolso</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="obligation-notes">Notas</Label>
        <textarea id="obligation-notes" name="notes" rows={2} maxLength={500} defaultValue={obligation?.notes ?? ''} className={`${selectClassName} min-h-16 resize-y py-2`} />
      </div>

      {latestExchangeRate && <p className="text-sm text-muted-foreground">TC disponible: 1 USD = {latestExchangeRate.usd_to_crc.toFixed(2)} CRC</p>}
      {state.message && <p aria-live="polite" className={state.status === 'success' ? 'text-sm text-success' : 'text-sm text-danger'}>{state.message}</p>}
      <DialogFooter>
        <Button type="submit" className="w-full sm:w-auto" disabled={pending || categories.length === 0}>{pending ? 'Guardando...' : obligation ? 'Guardar cambios' : 'Guardar pago recurrente'}</Button>
      </DialogFooter>
    </form>
  )
}
