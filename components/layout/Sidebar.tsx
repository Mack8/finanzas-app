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
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/',             label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/transactions', label: 'Transacciones', icon: ArrowLeftRight },
  { href: '/savings',      label: 'Ahorro',        icon: PiggyBank },
  { href: '/debts',        label: 'Deudas',        icon: TrendingDown },
  { href: '/cards',        label: 'Tarjetas',      icon: CreditCard },
  { href: '/reports',      label: 'Reportes',      icon: BarChart3 },
  { href: '/settings',     label: 'Configuración', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex flex-col w-56 min-h-screen border-r bg-card px-3 py-4 gap-1">
      <div className="px-3 py-2 mb-2">
        <h1 className="text-lg font-semibold tracking-tight">Finanzas</h1>
      </div>

      <nav className="flex flex-col gap-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
              pathname === href
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
