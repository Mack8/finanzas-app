'use client'

import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'

const labels: Record<string, string> = {
  '/':             'Resumen',
  '/transactions': 'Movimientos',
  '/savings':      'Ahorro',
  '/debts':        'Deudas',
  '/cards':        'Cuentas',
  '/reports':      'Reportes',
  '/settings':     'Configuración',
}

export function Breadcrumb() {
  const pathname = usePathname()
  const label = labels[pathname] ?? 'Finanzas'

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
      <span className="hidden text-muted-foreground sm:inline">Finanzas</span>
      <ChevronRight className="hidden size-3.5 shrink-0 text-muted-foreground/70 sm:block" aria-hidden="true" />
      <span className="truncate font-semibold text-foreground">{label}</span>
    </nav>
  )
}
