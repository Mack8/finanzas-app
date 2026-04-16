'use client'
import type { CategoryExpense } from '@/lib/reports'
export function ExpensesByCategoryChart({ data }: { data: CategoryExpense[] }) {
  return <p className="text-sm text-muted-foreground py-4">Cargando gráfico... ({data.length} categorías)</p>
}
