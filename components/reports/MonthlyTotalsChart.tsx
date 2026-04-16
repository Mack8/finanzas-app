'use client'
import type { MonthlyTotalsRow } from '@/lib/reports'
export function MonthlyTotalsChart({ data }: { data: MonthlyTotalsRow[] }) {
  return <p className="text-sm text-muted-foreground py-4">Cargando gráfico... ({data.length} meses)</p>
}
