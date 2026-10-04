'use client'

import { useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'
import { useFormDialogControls } from '@/components/layout/form-dialog-context'
import { useActionStateFormSubmit, useClosingActionState } from '@/components/ui/use-closing-action-state'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatMoney } from '@/lib/format'
import {
  recordRecurringObligationPaymentAction,
  type RecurringObligationActionState,
} from '@/app/(dashboard)/payments/actions'
import type { CurrencyCode } from '@/types/database'

type Props = {
  obligationId: string
  expectedAmount: number
  currency: CurrencyCode
  latestExchangeRate: { usd_to_crc: number } | null
}

const initialState: RecurringObligationActionState = { status: 'idle' }

export function RecordObligationPaymentForm({ obligationId, expectedAmount, currency, latestExchangeRate }: Props) {
  const { setOpen, setPending } = useFormDialogControls()
  const boundAction = useMemo(() => recordRecurringObligationPaymentAction.bind(null, obligationId), [obligationId])
  const [state, formAction, pending] = useClosingActionState(boundAction, initialState, setOpen)
  const handleSubmit = useActionStateFormSubmit(formAction)
  useEffect(() => setPending(pending), [pending, setPending])

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">Monto esperado: <span className="font-medium text-foreground">{formatMoney(expectedAmount, currency)}</span>. Ajustalo al importe que pagaste realmente.</p>
      <div className="space-y-2">
        <Label htmlFor="obligation-paid-amount">Monto pagado</Label>
        <Input id="obligation-paid-amount" name="amount" type="number" min="0.01" step="0.01" defaultValue={expectedAmount} required />
        {state.fieldErrors?.amount?.[0] && <p className="text-sm text-danger">{state.fieldErrors.amount[0]}</p>}
      </div>
      {currency === 'USD' && latestExchangeRate && <p className="text-sm text-muted-foreground">Se convertirá con el tipo de cambio actual: 1 USD = {latestExchangeRate.usd_to_crc.toFixed(2)} CRC.</p>}
      {currency === 'USD' && !latestExchangeRate && <p role="alert" className="text-sm text-danger">No hay tipo de cambio disponible; no se puede registrar el pago en USD.</p>}
      {state.message && <p aria-live="polite" className={state.status === 'success' ? 'text-sm text-success' : 'text-sm text-danger'}>{state.message}</p>}
      <DialogFooter>
        <Button type="submit" className="w-full sm:w-auto" disabled={pending || (currency === 'USD' && !latestExchangeRate)}>{pending ? 'Guardando...' : 'Guardar pago'}</Button>
      </DialogFooter>
    </form>
  )
}
