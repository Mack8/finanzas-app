'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'
import { useFormDialogControls } from '@/components/layout/form-dialog-context'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createPaymentAccountAction, type AccountActionState } from '@/app/(dashboard)/cards/actions'
import { useActionStateFormSubmit, useClosingActionState } from '@/components/ui/use-closing-action-state'

const initialState: AccountActionState = { status: 'idle' }

const selectClassName =
  'flex h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50'

export function CreateAccountForm() {
  const { setOpen, setPending } = useFormDialogControls()
  const [state, formAction, pending] = useClosingActionState(createPaymentAccountAction, initialState, setOpen)
  const handleSubmit = useActionStateFormSubmit(formAction)
  useEffect(() => setPending(pending), [pending, setPending])

  return (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" name="name" type="text" placeholder="Ej. BAC Visa, Cuenta corriente" required />
            {state.fieldErrors?.name?.[0] && <p className="text-sm text-danger">{state.fieldErrors.name[0]}</p>}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <select id="type" name="type" className={selectClassName} defaultValue="credit_card" required>
                <option value="credit_card">Tarjeta de crédito</option>
                <option value="bank_account">Cuenta bancaria</option>
              </select>
              {state.fieldErrors?.type?.[0] && <p className="text-sm text-danger">{state.fieldErrors.type[0]}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastFour">Últimos 4 dígitos</Label>
              <Input id="lastFour" name="lastFour" type="text" inputMode="numeric" maxLength={4} placeholder="0000" />
              {state.fieldErrors?.lastFour?.[0] && <p className="text-sm text-danger">{state.fieldErrors.lastFour[0]}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bankName">Banco (opcional)</Label>
            <Input id="bankName" name="bankName" type="text" placeholder="Ej. BAC, Promerica, BCR" />
            {state.fieldErrors?.bankName?.[0] && <p className="text-sm text-danger">{state.fieldErrors.bankName[0]}</p>}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="closingDay">Día de cierre (opcional)</Label>
              <Input id="closingDay" name="closingDay" type="number" min={1} max={31} placeholder="Ej. 20" />
              {state.fieldErrors?.closingDay?.[0] && <p className="text-sm text-danger">{state.fieldErrors.closingDay[0]}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentDueDay">Día de pago (opcional)</Label>
              <Input id="paymentDueDay" name="paymentDueDay" type="number" min={1} max={31} placeholder="Ej. 5" />
              {state.fieldErrors?.paymentDueDay?.[0] && <p className="text-sm text-danger">{state.fieldErrors.paymentDueDay[0]}</p>}
            </div>
          </div>

          {state.status === 'error' && state.message && (
            <p aria-live="polite" className="text-sm text-danger">
              {state.message}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
              {pending ? 'Guardando...' : 'Guardar cuenta'}
            </Button>
          </DialogFooter>
        </form>
  )
}
