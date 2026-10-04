'use client'

import { useId, useState, type ReactNode } from 'react'
import { Plus, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function CreationPanel({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <div className="space-y-4">
      <Button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}>
        {open ? <ChevronUp aria-hidden="true" /> : <Plus aria-hidden="true" />}
        {label}
      </Button>
      <div id={id} hidden={!open} className="max-w-2xl">
        {children}
      </div>
    </div>
  )
}
