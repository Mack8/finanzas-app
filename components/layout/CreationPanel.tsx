'use client'

import type { ReactNode } from 'react'
import { FormDialog } from './FormDialog'

export function CreationPanel({
  label,
  title,
  description,
  children,
}: {
  label: string
  title: string
  description?: string
  children: ReactNode
}) {
  return <FormDialog triggerLabel={label} title={title} description={description}>{children}</FormDialog>
}
