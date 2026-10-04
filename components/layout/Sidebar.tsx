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
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[2px] transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'overflow-hidden border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-linear',
          isMobile ? 'fixed bottom-0 top-0 z-50 shadow-elevated' : 'sticky top-0 h-screen',
          isOpen ? 'w-[280px]' : 'w-0',
        )}
        aria-label="Navegación principal"
        aria-hidden={!isOpen}
      >
        <div className="flex h-full w-[280px] flex-col px-4 py-6">
          <div className="mb-8 flex items-center justify-between px-2">
            <Link
              href="/"
              className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
              onClick={() => isMobile && toggleSidebar()}
            >
              <div className="flex size-9 items-center justify-center rounded-xl bg-success shadow-sm">
                <Wallet className="size-5 text-success-foreground" />
              </div>
              <div className="leading-tight">
                <span className="block text-base font-semibold text-sidebar-foreground">
                  Finanzas
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  Control personal
                </span>
              </div>
            </Link>

            {isMobile && (
              <button
                onClick={toggleSidebar}
                className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <X className="size-5" />
                <span className="sr-only">Cerrar menú</span>
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
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
                        aria-current={active ? 'page' : undefined}
                        onClick={() => isMobile && toggleSidebar()}
                        className={cn(
                          'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                          active
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground',
                        )}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
                        )}
                        <span
                          className={cn(
                            'flex size-8 items-center justify-center rounded-lg transition-colors',
                            active
                              ? 'bg-primary/10 text-primary'
                              : 'bg-transparent text-muted-foreground group-hover:text-sidebar-accent-foreground',
                          )}
                        >
                          <Icon className="size-4 shrink-0" aria-hidden="true" />
                        </span>
                        <span>{label}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </nav>
          </div>

          <div className="mt-4 rounded-xl border border-sidebar-border bg-muted/30 p-3">
            <p className="text-xs font-medium text-sidebar-foreground">Costa Rica · CRC</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Tipo de cambio BCCR integrado
            </p>
          </div>
        </div>
      </aside>
    </>
  )
}
