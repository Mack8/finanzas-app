'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getTodayCR } from '@/lib/format'
import { saveIncomeConfigAction, type IncomeConfigState } from '@/app/(dashboard)/settings/actions'
import type { IncomeConfig } from '@/types/domain'
import { useFormDialogControls } from '@/components/layout/form-dialog-context'
import { useActionStateFormSubmit, useClosingActionState } from '@/components/ui/use-closing-action-state'

type Props = {
  currentConfig: IncomeConfig | null
}

const initialState: IncomeConfigState = { status: 'idle' }

const selectClassName =
  'flex h-9 w-full cursor-pointer rounded-lg border border-input bg-card px-3 py-1.5 text-sm outline-none transition-colors duration-200 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30'

export function IncomeConfigForm({ currentConfig }: Props) {
  const { setOpen, setPending } = useFormDialogControls()
  const [state, formAction, pending] = useClosingActionState(saveIncomeConfigAction, initialState, setOpen)
  const handleSubmit = useActionStateFormSubmit(formAction)
  useEffect(() => setPending(pending), [pending, setPending])
  const today = getTodayCR()

  return (
        <form onSubmit={handleSubmit} className="space-y-4">
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

          {state.status === 'error' && state.message && (
            <p aria-live="polite" className="text-sm text-danger">
              {state.message}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
              {pending ? 'Guardando...' : 'Guardar configuración'}
            </Button>
          </DialogFooter>
        </form>
  )
}
