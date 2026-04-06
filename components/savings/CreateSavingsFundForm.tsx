'use client'

import { useActionState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createSavingsFundAction, type FundActionState } from '@/app/(dashboard)/savings/actions'

const selectClassName =
  'flex h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50'

const initialState: FundActionState = { status: 'idle' }

type Props = {
  latestExchangeRate: { usd_to_crc: number } | null
}

export function CreateSavingsFundForm({ latestExchangeRate }: Props) {
  const [state, formAction, pending] = useActionState(createSavingsFundAction, initialState)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.status === 'success') formRef.current?.reset()
  }, [state.status])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nuevo fondo de ahorro</CardTitle>
        <CardDescription>Definí una meta, un plazo y un aporte mensual estimado.</CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="space-y-4">
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
            <Label htmlFor="fund-color">Color</Label>
            <Input id="fund-color" name="color" type="color" defaultValue="#3b82f6" className="h-10 w-full cursor-pointer p-1" />
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
            {pending ? 'Guardando...' : 'Crear fondo'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
