'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useClosingActionState } from '@/components/ui/use-closing-action-state'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { deleteContributionAction, type DeleteContributionState } from '@/app/(dashboard)/savings/actions'

type Props = {
  contributionId: string
  amountLabel: string
}

const initialState: DeleteContributionState = { status: 'idle' }

export function DeleteContributionButton({ contributionId, amountLabel }: Props) {
  const [open, setOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const boundAction = useMemo(() => deleteContributionAction.bind(null, contributionId), [contributionId])
  const [state, formAction, pending] = useClosingActionState(boundAction, initialState, setOpen)

  function handleOpenChange(next: boolean) {
    if (!next) setFormKey(k => k + 1)
    setOpen(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger disabled={pending} render={<Button variant="ghost" size="sm" />}>Eliminar</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Eliminar aporte?</DialogTitle>
          <DialogDescription>
            El aporte de {amountLabel} se eliminará y el saldo del fondo se ajustará. Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <form key={formKey} action={formAction}>
          {state.message && <p aria-live="polite" className="mb-3 text-sm text-danger">{state.message}</p>}
          <DialogFooter showCloseButton>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
