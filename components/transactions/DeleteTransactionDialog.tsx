'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useClosingActionState } from '@/components/ui/use-closing-action-state'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  deleteTransactionAction,
  type DeleteTransactionState,
} from '@/app/(dashboard)/transactions/actions'

type Props = {
  transactionId: string
  description: string
}

const initialState: DeleteTransactionState = { status: 'idle' }

export function DeleteTransactionDialog({ transactionId, description }: Props) {
  const [open, setOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const boundAction = useMemo(
    () => deleteTransactionAction.bind(null, transactionId),
    [transactionId]
  )
  const [state, formAction, pending] = useClosingActionState(boundAction, initialState, setOpen)

  function handleOpenChange(next: boolean) {
    if (!next) setFormKey(k => k + 1)
    setOpen(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Eliminar
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Eliminar transacción?</DialogTitle>
          <DialogDescription>
            Vas a eliminar &ldquo;{description}&rdquo;. Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <form key={formKey} action={formAction}>
          {state.message && (
            <p className="mb-3 text-sm text-danger">{state.message}</p>
          )}
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
