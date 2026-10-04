'use client'

import { useCallback, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useActionStateFormSubmit, useClosingActionState } from '@/components/ui/use-closing-action-state'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updatePaymentAccountAction, type AccountActionState } from '@/app/(dashboard)/cards/actions'
import type { PaymentAccount } from '@/types/domain'

type Props = { account: PaymentAccount }

const initialState: AccountActionState = { status: 'idle' }

const selectClassName =
  'flex h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50'

export function EditAccountDialog({ account }: Props) {
  const [open, setOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const boundAction = useMemo(() => updatePaymentAccountAction.bind(null, account.id), [account.id])
  const closeAwareSetOpen = useCallback((next: boolean) => {
    setOpen(next)
    if (!next) setFormKey(key => key + 1)
  }, [])
  const [state, formAction, pending, resetActionState] = useClosingActionState(boundAction, initialState, closeAwareSetOpen)
  const handleSubmit = useActionStateFormSubmit(formAction)

  function handleOpenChange(next: boolean) {
    if (pending && !next) return
    if (!next) resetActionState()
    closeAwareSetOpen(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger disabled={pending} render={<Button variant="outline" size="sm" />}>Editar</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar cuenta</DialogTitle>
        </DialogHeader>
        <form key={formKey} onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`edit-name-${account.id}`}>Nombre</Label>
            <Input id={`edit-name-${account.id}`} name="name" type="text" defaultValue={account.name} required />
            {state.fieldErrors?.name?.[0] && <p className="text-sm text-danger">{state.fieldErrors.name[0]}</p>}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`edit-type-${account.id}`}>Tipo</Label>
              <select id={`edit-type-${account.id}`} name="type" className={selectClassName} defaultValue={account.type} required>
                <option value="credit_card">Tarjeta de crédito</option>
                <option value="bank_account">Cuenta bancaria</option>
              </select>
              {state.fieldErrors?.type?.[0] && <p className="text-sm text-danger">{state.fieldErrors.type[0]}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor={`edit-lastFour-${account.id}`}>Últimos 4 dígitos</Label>
              <Input id={`edit-lastFour-${account.id}`} name="lastFour" type="text" inputMode="numeric" maxLength={4} defaultValue={account.last_four ?? ''} />
              {state.fieldErrors?.lastFour?.[0] && <p className="text-sm text-danger">{state.fieldErrors.lastFour[0]}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`edit-bankName-${account.id}`}>Banco (opcional)</Label>
            <Input id={`edit-bankName-${account.id}`} name="bankName" type="text" defaultValue={account.bank_name ?? ''} />
            {state.fieldErrors?.bankName?.[0] && <p className="text-sm text-danger">{state.fieldErrors.bankName[0]}</p>}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`edit-closingDay-${account.id}`}>Día de cierre</Label>
              <Input id={`edit-closingDay-${account.id}`} name="closingDay" type="number" min={1} max={31} defaultValue={account.closing_day ?? ''} />
              {state.fieldErrors?.closingDay?.[0] && <p className="text-sm text-danger">{state.fieldErrors.closingDay[0]}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor={`edit-paymentDueDay-${account.id}`}>Día de pago</Label>
              <Input id={`edit-paymentDueDay-${account.id}`} name="paymentDueDay" type="number" min={1} max={31} defaultValue={account.payment_due_day ?? ''} />
              {state.fieldErrors?.paymentDueDay?.[0] && <p className="text-sm text-danger">{state.fieldErrors.paymentDueDay[0]}</p>}
            </div>
          </div>

          {state.status === 'error' && state.message && (
            <p aria-live="polite" className="text-sm text-danger">{state.message}</p>
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
