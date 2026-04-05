'use client'

import { useActionState, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
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
  const boundAction = deleteTransactionAction.bind(null, transactionId)
  const [state, formAction, pending] = useActionState(boundAction, initialState)

  useEffect(() => {
    if (state.status === 'success') {
      setOpen(false)
    }
  }, [state.status])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
        <form action={formAction}>
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
