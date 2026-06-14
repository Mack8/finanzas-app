'use client'

import { usePathname } from 'next/navigation'

const labels: Record<string, string> = {
  '/':             'Dashboard',
  '/transactions': 'Transacciones',
  '/savings':      'Ahorro',
  '/debts':        'Deudas',
  '/cards':        'Tarjetas',
  '/reports':      'Reportes',
  '/settings':     'Configuración',
}

export function Breadcrumb() {
  const pathname = usePathname()
  const label = labels[pathname] ?? 'Finanzas'

  return (
    <nav className="flex items-center gap-1.5 text-sm">
      <span className="text-muted-foreground">Finanzas</span>
      <span className="text-muted-foreground">/</span>
      <span className="font-medium text-foreground">{label}</span>
    </nav>
  )
}
