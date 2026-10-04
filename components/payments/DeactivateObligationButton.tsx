'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useClosingActionState } from '@/components/ui/use-closing-action-state'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  deactivateRecurringObligationAction,
  type RecurringObligationDeleteState,
} from '@/app/(dashboard)/payments/actions'

const initialState: RecurringObligationDeleteState = { status: 'idle' }

export function DeactivateObligationButton({ obligationId, name }: { obligationId: string; name: string }) {
  const [open, setOpen] = useState(false)
  const boundAction = useMemo(() => deactivateRecurringObligationAction.bind(null, obligationId), [obligationId])
  const [state, formAction, pending, resetActionState] = useClosingActionState(boundAction, initialState, setOpen)

  function handleOpenChange(next: boolean) {
    if (pending && !next) return
    if (!next) resetActionState()
    setOpen(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger disabled={pending} render={<Button variant="outline" size="sm" />}>Desactivar</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Desactivar este pago?</DialogTitle>
          <DialogDescription>“{name}” dejará de aparecer en próximos vencimientos. Su historial se conserva.</DialogDescription>
        </DialogHeader>
        <form action={formAction}>
          {state.message && <p aria-live="polite" className="mb-3 text-sm text-danger">{state.message}</p>}
          <DialogFooter showCloseButton>
            <Button type="submit" variant="destructive" disabled={pending}>{pending ? 'Desactivando...' : 'Confirmar desactivación'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
