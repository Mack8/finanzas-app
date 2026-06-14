'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type SidebarContextValue = {
  isOpen: boolean
  isMobile: boolean
  toggleSidebar: () => void
  setIsOpen: (v: boolean) => void
}

const SidebarContext = createContext<SidebarContextValue | null>(null)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isMobile, setIsMobile] = useState(false)
  const [isOpen, setIsOpen] = useState(true)

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 850
      setIsMobile(mobile)
      setIsOpen(!mobile)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const toggleSidebar = () => setIsOpen(v => !v)

  return (
    <SidebarContext.Provider value={{ isOpen, isMobile, toggleSidebar, setIsOpen }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebarContext() {
  const ctx = useContext(SidebarContext)
  if (!ctx) throw new Error('useSidebarContext must be used inside SidebarProvider')
  return ctx
}
