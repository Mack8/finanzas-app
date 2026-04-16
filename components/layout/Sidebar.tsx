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
    <aside className="hidden md:flex flex-col w-14 min-h-screen border-r bg-card dark:bg-sidebar px-2 py-4 gap-1">
      <div className="flex items-center justify-center py-3 mb-2">
        <Wallet className="h-6 w-6" />
      </div>

      <nav className="flex flex-col gap-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            title={label}
            className={cn(
              'flex items-center justify-center rounded-md p-2 transition-colors',
              pathname === href
                ? 'bg-primary text-primary-foreground dark:bg-sidebar-primary dark:text-sidebar-primary-foreground'
                : 'text-muted-foreground dark:text-sidebar-foreground hover:bg-muted dark:hover:bg-sidebar-accent hover:text-foreground dark:hover:text-sidebar-accent-foreground'
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
          </Link>
        ))}
      </nav>
    </aside>
  )
}
