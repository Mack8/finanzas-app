'use client'

import { createContext, useContext } from 'react'

export type FormDialogControls = {
  setOpen(open: boolean): void
  setPending(pending: boolean): void
}

export const FormDialogContext = createContext<FormDialogControls | null>(null)

export function useFormDialogControls(): FormDialogControls {
  const controls = useContext(FormDialogContext)
  if (!controls) {
    throw new Error('useFormDialogControls must be used inside a FormDialog.')
  }
  return controls
}
