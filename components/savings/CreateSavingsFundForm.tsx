'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'
import { useFormDialogControls } from '@/components/layout/form-dialog-context'
import { useActionStateFormSubmit, useClosingActionState } from '@/components/ui/use-closing-action-state'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createSavingsFundAction, type FundActionState } from '@/app/(dashboard)/savings/actions'
import { FINANCIAL_COLOR_PALETTE, type FinancialPaletteColor } from '@/lib/financial-colors'
import { PaletteColorField } from '@/components/ui/PaletteColorField'

const selectClassName =
  'flex h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50'

const initialState: FundActionState = { status: 'idle' }

type Props = {
  latestExchangeRate: { usd_to_crc: number } | null
  suggestedColor: FinancialPaletteColor
}

export function CreateSavingsFundForm({ latestExchangeRate, suggestedColor }: Props) {
  const { setOpen, setPending } = useFormDialogControls()
  const [state, formAction, pending] = useClosingActionState(createSavingsFundAction, initialState, setOpen)
  const handleSubmit = useActionStateFormSubmit(formAction)
  const [color, setColor] = useState<FinancialPaletteColor>(suggestedColor)
  useEffect(() => setPending(pending), [pending, setPending])

  return (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fund-name">Nombre</Label>
            <Input id="fund-name" name="name" type="text" placeholder="Ej. Emergencia, Vacaciones" required />
            {state.fieldErrors?.name?.[0] && <p className="text-sm text-danger">{state.fieldErrors.name[0]}</p>}
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_120px]">
            <div className="space-y-2">
              <Label htmlFor="fund-goal">Meta</Label>
              <Input id="fund-goal" name="goalAmount" type="number" step="0.01" min="0.01" placeholder="0.00" required />
              {state.fieldErrors?.goalAmount?.[0] && <p className="text-sm text-danger">{state.fieldErrors.goalAmount[0]}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="fund-goal-currency">Moneda</Label>
              <select id="fund-goal-currency" name="goalCurrency" className={selectClassName} defaultValue="CRC">
                <option value="CRC">CRC</option>
                <option value="USD" disabled={!latestExchangeRate}>USD {!latestExchangeRate ? '(sin TC)' : ''}</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fund-date">Fecha meta</Label>
            <Input id="fund-date" name="targetDate" type="date" required />
            {state.fieldErrors?.targetDate?.[0] && <p className="text-sm text-danger">{state.fieldErrors.targetDate[0]}</p>}
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_120px]">
            <div className="space-y-2">
              <Label htmlFor="fund-contrib">Aporte mensual estimado</Label>
              <Input id="fund-contrib" name="monthlyContributionAmount" type="number" step="0.01" min="0.01" placeholder="Opcional" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fund-contrib-currency">Moneda</Label>
              <select id="fund-contrib-currency" name="monthlyContributionCurrency" className={selectClassName} defaultValue="CRC">
                <option value="CRC">CRC</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fund-color">Color del fondo</Label>
            <PaletteColorField
              id="fund-color"
              name="color"
              value={color}
              onValueChange={nextColor => setColor(nextColor as FinancialPaletteColor)}
              options={FINANCIAL_COLOR_PALETTE}
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

          <DialogFooter>
            <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
              {pending ? 'Guardando...' : 'Crear fondo'}
            </Button>
          </DialogFooter>
        </form>
  )
}
