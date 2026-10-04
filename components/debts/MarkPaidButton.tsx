'use client'

import { useCallback, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useClosingActionState } from '@/components/ui/use-closing-action-state'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { markInstallmentPaidAction, type MarkPaidState } from '@/app/(dashboard)/debts/actions'

type Props = {
  debtId: string
  debtName: string
  paidInstallments: number
  totalInstallments: number
}

const initialState: MarkPaidState = { status: 'idle' }

export function MarkPaidButton({ debtId, debtName, paidInstallments, totalInstallments }: Props) {
  const [open, setOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const boundAction = useMemo(() => markInstallmentPaidAction.bind(null, debtId), [debtId])
  const closeAwareSetOpen = useCallback((next: boolean) => {
    setOpen(next)
    if (!next) setFormKey(key => key + 1)
  }, [])
  const [state, formAction, pending, resetActionState] = useClosingActionState(boundAction, initialState, closeAwareSetOpen)

  function handleOpenChange(next: boolean) {
    if (pending && !next) return
    if (!next) resetActionState()
    closeAwareSetOpen(next)
  }

  const nextPaid = paidInstallments + 1
  const isLastInstallment = nextPaid >= totalInstallments

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger disabled={pending} render={<Button variant="outline" size="sm" />}>
        Marcar pagada
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar pago de cuota</DialogTitle>
          <DialogDescription>
            {isLastInstallment
              ? `Vas a marcar la última cuota de "${debtName}" como pagada. La deuda quedará completada.`
              : `Cuota ${nextPaid} de ${totalInstallments} para "${debtName}".`}
          </DialogDescription>
        </DialogHeader>
        <form key={formKey} action={formAction}>
          {state.message && <p aria-live="polite" className="mb-3 text-sm text-danger">{state.message}</p>}
          <DialogFooter showCloseButton>
            <Button type="submit" disabled={pending}>
              {pending ? 'Guardando...' : 'Confirmar pago'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
