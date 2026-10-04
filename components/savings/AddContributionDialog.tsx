'use client'

import { useCallback, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useActionStateFormSubmit, useClosingActionState } from '@/components/ui/use-closing-action-state'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getTodayCR } from '@/lib/format'
import { addContributionAction, type ContributionActionState } from '@/app/(dashboard)/savings/actions'

const selectClassName =
  'flex h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50'

type Props = {
  fundId: string
  fundName: string
  latestExchangeRate: { usd_to_crc: number } | null
}

const initialState: ContributionActionState = { status: 'idle' }

export function AddContributionDialog({ fundId, fundName, latestExchangeRate }: Props) {
  const [open, setOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const boundAction = useMemo(() => addContributionAction.bind(null, fundId), [fundId])
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
      <DialogTrigger disabled={pending} render={<Button variant="outline" size="sm" />}>
        Agregar aporte
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Aporte a {fundName}</DialogTitle>
        </DialogHeader>
        <form key={formKey} onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`contrib-date-${fundId}`}>Fecha</Label>
              <Input
                id={`contrib-date-${fundId}`}
                name="date"
                type="date"
                defaultValue={getTodayCR()}
                required
              />
              {state.fieldErrors?.date?.[0] && <p className="text-sm text-danger">{state.fieldErrors.date[0]}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor={`contrib-amount-${fundId}`}>Monto</Label>
              <Input id={`contrib-amount-${fundId}`} name="amount" type="number" step="0.01" min="0.01" placeholder="0.00" required />
              {state.fieldErrors?.amount?.[0] && <p className="text-sm text-danger">{state.fieldErrors.amount[0]}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`contrib-currency-${fundId}`}>Moneda</Label>
            <select id={`contrib-currency-${fundId}`} name="currency" className={selectClassName} defaultValue="CRC">
              <option value="CRC">CRC</option>
              <option value="USD" disabled={!latestExchangeRate}>USD {!latestExchangeRate ? '(sin TC)' : ''}</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`contrib-notes-${fundId}`}>Notas</Label>
            <textarea
              id={`contrib-notes-${fundId}`}
              name="notes"
              rows={2}
              className={`${selectClassName} min-h-16 resize-y py-2`}
              placeholder="Opcional"
            />
          </div>

          {state.message && (
            <p aria-live="polite" className="text-sm text-danger">{state.message}</p>
          )}

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={pending}>
              {pending ? 'Guardando...' : 'Registrar aporte'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
