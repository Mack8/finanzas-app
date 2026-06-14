'use client'

import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSidebarContext } from './sidebar-context'

export function HamburgerButton() {
  const { toggleSidebar } = useSidebarContext()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
      aria-label="Abrir / cerrar menú"
    >
      <Menu className="h-5 w-5" />
    </Button>
  )
}
