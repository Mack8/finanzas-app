'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useClosingActionState } from '@/components/ui/use-closing-action-state'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { setDebtNextDueDateAction, type DebtActionState } from '@/app/(dashboard)/debts/actions'

const initialState: DebtActionState = { status: 'idle' }

export function ConfigureDebtDueDateButton({ debtId, debtName }: { debtId: string; debtName: string }) {
  const [open, setOpen] = useState(false)
  const boundAction = useMemo(() => setDebtNextDueDateAction.bind(null, debtId), [debtId])
  const [state, formAction, pending, resetActionState] = useClosingActionState(boundAction, initialState, setOpen)

  function handleOpenChange(next: boolean) {
    if (pending && !next) return
    if (!next) resetActionState()
    setOpen(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger disabled={pending} render={<Button variant="outline" size="sm" />}>Configurar vencimiento</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Próximo vencimiento</DialogTitle>
          <DialogDescription>Elegí la fecha exacta de la próxima cuota de “{debtName}”. No cambia el saldo ni el historial.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`debt-due-${debtId}`}>Fecha de vencimiento</Label>
            <Input id={`debt-due-${debtId}`} name="nextDueDate" type="date" required />
            {state.fieldErrors?.nextDueDate?.[0] && <p className="text-sm text-danger">{state.fieldErrors.nextDueDate[0]}</p>}
          </div>
          {state.message && <p aria-live="polite" className="text-sm text-danger">{state.message}</p>}
          <DialogFooter showCloseButton>
            <Button type="submit" disabled={pending}>{pending ? 'Guardando...' : 'Guardar fecha'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
