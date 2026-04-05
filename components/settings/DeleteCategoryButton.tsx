'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
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
  deleteCategoryAction,
  type DeleteCategoryState,
} from '@/app/(dashboard)/settings/actions'

type Props = {
  categoryId: string
  categoryName: string
  transactionCount: number
}

const initialState: DeleteCategoryState = { status: 'idle' }

export function DeleteCategoryButton({ categoryId, categoryName, transactionCount }: Props) {
  const [open, setOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)

  const boundAction = useMemo(
    () => deleteCategoryAction.bind(null, categoryId),
    [categoryId]
  )
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
        title="Tiene transacciones — desactivala en cambio"
      >
        Eliminar
      </Button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Eliminar
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Eliminar categoría?</DialogTitle>
          <DialogDescription>
            Vas a eliminar &ldquo;{categoryName}&rdquo;. Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <form key={formKey} action={formAction}>
          {state.message && (
            <p aria-live="polite" className="mb-3 text-sm text-danger">{state.message}</p>
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
