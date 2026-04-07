'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { deletePaymentAccountAction, type DeleteAccountState } from '@/app/(dashboard)/cards/actions'

type Props = {
  accountId: string
  accountName: string
  transactionCount: number
}

const initialState: DeleteAccountState = { status: 'idle' }

export function DeleteAccountButton({ accountId, accountName, transactionCount }: Props) {
  const [open, setOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const boundAction = useMemo(() => deletePaymentAccountAction.bind(null, accountId), [accountId])
  const [state, formAction, pending] = useActionState(boundAction, initialState)

  useEffect(() => {
    if (state.status === 'success') setOpen(false)
  }, [state.status])

  function handleOpenChange(next: boolean) {
    if (!next) setFormKey(k => k + 1)
    setOpen(next)
  }

  if (transactionCount > 0) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        title={`Tiene ${transactionCount} transacción(es) — eliminá las transacciones primero`}
      >
        Eliminar
      </Button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Eliminar</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Eliminar cuenta?</DialogTitle>
          <DialogDescription>
            Vas a eliminar &ldquo;{accountName}&rdquo;. Esta acción no se puede deshacer.
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
