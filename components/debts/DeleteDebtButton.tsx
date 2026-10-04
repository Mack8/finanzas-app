'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useClosingActionState } from '@/components/ui/use-closing-action-state'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { deleteDebtAction, type DeleteDebtState } from '@/app/(dashboard)/debts/actions'

type Props = {
  debtId: string
  debtName: string
  paidInstallments: number
}

const initialState: DeleteDebtState = { status: 'idle' }

export function DeleteDebtButton({ debtId, debtName, paidInstallments }: Props) {
  const [open, setOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const boundAction = useMemo(() => deleteDebtAction.bind(null, debtId), [debtId])
  const [state, formAction, pending] = useClosingActionState(boundAction, initialState, setOpen)

  function handleOpenChange(next: boolean) {
    if (!next) setFormKey(k => k + 1)
    setOpen(next)
  }

  if (paidInstallments > 0) {
    return (
      <Button variant="outline" size="sm" disabled title="Tiene cuotas pagadas — desactivala en cambio">
        Eliminar
      </Button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Eliminar</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Eliminar deuda?</DialogTitle>
          <DialogDescription>
            Vas a eliminar &ldquo;{debtName}&rdquo;. Esta acción no se puede deshacer.
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
