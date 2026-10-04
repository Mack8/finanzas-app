'use client'

import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { FormDialogContext } from './form-dialog-context'

export function FormDialog({
  triggerLabel,
  title,
  description,
  children,
}: {
  triggerLabel: string
  title: string
  description?: string
  children: ReactNode
}) {
  const [open, setOpenState] = useState(false)
  const [pending, setPending] = useState(false)
  const setOpen = useCallback((nextOpen: boolean) => {
    setOpenState(nextOpen)
    if (!nextOpen) setPending(false)
  }, [])
  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (pending && !nextOpen) return
    setOpenState(nextOpen)
    if (!nextOpen) setPending(false)
  }, [pending])
  const controls = useMemo(() => ({ setOpen, setPending }), [setOpen])

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
    >
      <DialogTrigger
        render={<Button type="button" />}
      >
        <Plus aria-hidden="true" />
        {triggerLabel}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader className="pr-8">
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {open ? <FormDialogContext.Provider value={controls}>{children}</FormDialogContext.Provider> : null}
      </DialogContent>
    </Dialog>
  )
}
