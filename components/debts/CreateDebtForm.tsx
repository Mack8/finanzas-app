'use client'

import { useActionState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createDebtAction, type DebtActionState } from '@/app/(dashboard)/debts/actions'

const selectClassName =
  'flex h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50'

const initialState: DebtActionState = { status: 'idle' }

type Props = {
  latestExchangeRate: { usd_to_crc: number } | null
}

export function CreateDebtForm({ latestExchangeRate }: Props) {
  const [state, formAction, pending] = useActionState(createDebtAction, initialState)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.status === 'success') formRef.current?.reset()
  }, [state.status])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nueva deuda</CardTitle>
        <CardDescription>Registrá cuotas fijas: leasing, tarjetas a plazo, préstamos.</CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="debt-name">Nombre</Label>
            <Input id="debt-name" name="name" type="text" placeholder="Ej. Leasing, Claro BAC" required />
            {state.fieldErrors?.name?.[0] && <p className="text-sm text-danger">{state.fieldErrors.name[0]}</p>}
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_120px]">
            <div className="space-y-2">
              <Label htmlFor="debt-amount">Monto mensual</Label>
              <Input id="debt-amount" name="monthlyAmount" type="number" step="0.01" min="0.01" placeholder="0.00" required />
              {state.fieldErrors?.monthlyAmount?.[0] && <p className="text-sm text-danger">{state.fieldErrors.monthlyAmount[0]}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="debt-currency">Moneda</Label>
              <select id="debt-currency" name="currency" className={selectClassName} defaultValue="CRC">
                <option value="CRC">CRC</option>
                <option value="USD" disabled={!latestExchangeRate}>USD {!latestExchangeRate ? '(sin TC)' : ''}</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="debt-installments">Total de cuotas</Label>
              <Input id="debt-installments" name="totalInstallments" type="number" min="1" max="360" placeholder="Ej. 24" required />
              {state.fieldErrors?.totalInstallments?.[0] && <p className="text-sm text-danger">{state.fieldErrors.totalInstallments[0]}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="debt-start">Fecha de inicio</Label>
              <Input id="debt-start" name="startDate" type="date" required />
              {state.fieldErrors?.startDate?.[0] && <p className="text-sm text-danger">{state.fieldErrors.startDate[0]}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="debt-notes">Notas</Label>
            <textarea
              id="debt-notes"
              name="notes"
              rows={2}
              className={`${selectClassName} min-h-16 resize-y py-2`}
              placeholder="Opcional"
            />
          </div>

          {latestExchangeRate && (
            <p className="text-sm text-muted-foreground">TC disponible: 1 USD = {latestExchangeRate.usd_to_crc.toFixed(2)} CRC</p>
          )}

          {state.message && (
            <p aria-live="polite" className={state.status === 'success' ? 'text-sm text-success' : 'text-sm text-danger'}>
              {state.message}
            </p>
          )}

          <Button type="submit" disabled={pending}>
            {pending ? 'Guardando...' : 'Registrar deuda'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
