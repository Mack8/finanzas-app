'use client'

import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, type TooltipProps
} from 'recharts'
import { formatMoney } from '@/lib/format'
import type { MonthlyTotalsRow } from '@/lib/reports'

type Props = { data: MonthlyTotalsRow[] }
type FormattedRow = MonthlyTotalsRow & { label: string }

const INCOME_COLOR = 'oklch(0.65 0.18 142)'
const EXPENSE_COLOR = 'oklch(0.60 0.22 25)'

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5 shadow-md text-sm min-w-[160px]">
      <p className="font-medium text-card-foreground mb-1.5">{label}</p>
      {payload.map(entry => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="inline-block h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
            {entry.dataKey === 'income' ? 'Ingresos' : 'Gastos'}
          </span>
          <span className="font-medium text-card-foreground tabular-nums">
            {formatMoney(entry.value ?? 0, 'CRC')}
          </span>
        </div>
      ))}
    </div>
  )
}

export function DashboardAreaChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        Sin datos disponibles.
      </div>
    )
  }

  const formatted: FormattedRow[] = data.map(row => ({
    ...row,
    label: new Intl.DateTimeFormat('es-CR', { month: 'short', timeZone: 'UTC' }).format(new Date(`${row.month}-01T00:00:00Z`)),
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={formatted} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={INCOME_COLOR} stopOpacity={0.3} />
            <stop offset="95%" stopColor={INCOME_COLOR} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={EXPENSE_COLOR} stopOpacity={0.3} />
            <stop offset="95%" stopColor={EXPENSE_COLOR} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'currentColor' }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={v => v === 0 ? '₡0' : `₡${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: 'currentColor' }} axisLine={false} tickLine={false} width={52} />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="income" stroke={INCOME_COLOR} strokeWidth={2} fill="url(#incomeGrad)" dot={false} />
        <Area type="monotone" dataKey="expenses" stroke={EXPENSE_COLOR} strokeWidth={2} fill="url(#expenseGrad)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
