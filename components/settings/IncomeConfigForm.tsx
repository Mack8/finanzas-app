'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { saveIncomeConfigAction, type IncomeConfigState } from '@/app/(dashboard)/settings/actions'
import type { IncomeConfig } from '@/types/domain'

type Props = {
  currentConfig: IncomeConfig | null
}

const initialState: IncomeConfigState = { status: 'idle' }

const selectClassName =
  'flex h-9 w-full cursor-pointer rounded-lg border border-input bg-card px-3 py-1.5 text-sm outline-none transition-colors duration-200 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30'

export function IncomeConfigForm({ currentConfig }: Props) {
  const [state, formAction, pending] = useActionState(saveIncomeConfigAction, initialState)
  const today = new Date().toISOString().slice(0, 10)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuración de ingresos</CardTitle>
        <CardDescription>
          Ingresá tu salario mensual. Podés tener dos pagos (ej. quincenas). Cada guardado crea un nuevo registro con su fecha de vigencia — el historial se preserva.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstPaymentAmount">Monto primer pago</Label>
              <Input
                id="firstPaymentAmount"
                name="firstPaymentAmount"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue={currentConfig?.first_payment_amount ?? ''}
                placeholder="0.00"
                required
              />
              {state.fieldErrors?.firstPaymentAmount?.[0] && (
                <p className="text-sm text-danger">{state.fieldErrors.firstPaymentAmount[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="firstPaymentDay">Día del primer pago</Label>
              <Input
                id="firstPaymentDay"
                name="firstPaymentDay"
                type="number"
                min={1}
                max={31}
                defaultValue={currentConfig?.first_payment_day ?? ''}
                placeholder="Ej. 15"
                required
              />
              {state.fieldErrors?.firstPaymentDay?.[0] && (
                <p className="text-sm text-danger">{state.fieldErrors.firstPaymentDay[0]}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="secondPaymentAmount">Monto segundo pago (opcional)</Label>
              <Input
                id="secondPaymentAmount"
                name="secondPaymentAmount"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue={currentConfig?.second_payment_amount ?? ''}
                placeholder="0.00"
              />
              {state.fieldErrors?.secondPaymentAmount?.[0] && (
                <p className="text-sm text-danger">{state.fieldErrors.secondPaymentAmount[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondPaymentDay">Día del segundo pago</Label>
              <Input
                id="secondPaymentDay"
                name="secondPaymentDay"
                type="number"
                min={1}
                max={31}
                defaultValue={currentConfig?.second_payment_day ?? ''}
                placeholder="Ej. 30"
              />
              {state.fieldErrors?.secondPaymentDay?.[0] && (
                <p className="text-sm text-danger">{state.fieldErrors.secondPaymentDay[0]}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="income-currency">Moneda</Label>
              <select
                id="income-currency"
                name="currency"
                className={selectClassName}
                defaultValue={currentConfig?.currency ?? 'CRC'}
                required
              >
                <option value="CRC">CRC</option>
                <option value="USD">USD</option>
              </select>
              {state.fieldErrors?.currency?.[0] && (
                <p className="text-sm text-danger">{state.fieldErrors.currency[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="effectiveFrom">Vigente desde</Label>
              <Input
                id="effectiveFrom"
                name="effectiveFrom"
                type="date"
                defaultValue={today}
                required
              />
              {state.fieldErrors?.effectiveFrom?.[0] && (
                <p className="text-sm text-danger">{state.fieldErrors.effectiveFrom[0]}</p>
              )}
            </div>
          </div>

          {state.message && (
            <p aria-live="polite" className={state.status === 'success' ? 'text-sm text-success' : 'text-sm text-danger'}>
              {state.message}
            </p>
          )}

          <Button type="submit" className="w-full md:w-auto" disabled={pending}>
            {pending ? 'Guardando...' : 'Guardar configuración'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
