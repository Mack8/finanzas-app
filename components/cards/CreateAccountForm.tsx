'use client'

import { useActionState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createPaymentAccountAction, type AccountActionState } from '@/app/(dashboard)/cards/actions'

const initialState: AccountActionState = { status: 'idle' }

const selectClassName =
  'flex h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50'

export function CreateAccountForm() {
  const [state, formAction, pending] = useActionState(createPaymentAccountAction, initialState)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.status === 'success') formRef.current?.reset()
  }, [state.status])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nueva cuenta</CardTitle>
        <CardDescription>Registrá tarjetas de crédito o cuentas bancarias para asociarlas a tus transacciones.</CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="space-y-4">
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

          {state.message && (
            <p aria-live="polite" className={state.status === 'success' ? 'text-sm text-success' : 'text-sm text-danger'}>
              {state.message}
            </p>
          )}

          <Button type="submit" className="w-full md:w-auto" disabled={pending}>
            {pending ? 'Guardando...' : 'Guardar cuenta'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
