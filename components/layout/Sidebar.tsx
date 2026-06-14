'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ArrowLeftRight,
  PiggyBank,
  CreditCard,
  TrendingDown,
  BarChart3,
  Settings,
  Wallet,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebarContext } from './sidebar-context'

const navItems = [
  { href: '/',             label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/transactions', label: 'Transacciones',  icon: ArrowLeftRight },
  { href: '/savings',      label: 'Ahorro',         icon: PiggyBank },
  { href: '/debts',        label: 'Deudas',         icon: TrendingDown },
  { href: '/cards',        label: 'Tarjetas',       icon: CreditCard },
  { href: '/reports',      label: 'Reportes',       icon: BarChart3 },
  { href: '/settings',     label: 'Configuración',  icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { isOpen, isMobile, setIsOpen, toggleSidebar } = useSidebarContext()

  return (
    <>
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'overflow-hidden border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-linear',
          isMobile ? 'fixed bottom-0 top-0 z-50' : 'sticky top-0 h-screen',
          isOpen ? 'w-[290px]' : 'w-0',
        )}
        aria-label="Navegación principal"
        aria-hidden={!isOpen}
      >
        <div className="flex h-full flex-col py-8 pl-6 pr-4">
          {/* Logo */}
          <div className="flex items-center justify-between mb-8 pr-2">
            <Link
              href="/"
              className="flex items-center gap-2.5"
              onClick={() => isMobile && toggleSidebar()}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-semibold text-sidebar-foreground">
                Finanzas
              </span>
            </Link>

            {isMobile && (
              <button
                onClick={toggleSidebar}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
                <span className="sr-only">Cerrar menú</span>
              </button>
            )}
          </div>

          {/* Nav */}
          <div className="flex-1 overflow-y-auto">
            <p className="mb-4 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Menú principal
            </p>
            <nav>
              <ul className="space-y-1">
                {navItems.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        onClick={() => isMobile && toggleSidebar()}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                          active
                            ? 'bg-primary/10 text-primary'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                        )}
                      >
                        <Icon
                          className={cn('h-5 w-5 shrink-0', active ? 'text-primary' : '')}
                          aria-hidden="true"
                        />
                        <span>{label}</span>
                        {active && (
                          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </nav>
          </div>
        </div>
      </aside>
    </>
  )
}
