'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  type TooltipProps,
} from 'recharts'
import { formatMoney } from '@/lib/format'
import type { MonthlyTotalsRow } from '@/lib/reports'

type Props = {
  data: MonthlyTotalsRow[]
}

type FormattedRow = MonthlyTotalsRow & { label: string }

const SERIES = [
  { key: 'income',   label: 'Ingresos', color: '#22c55e' },
  { key: 'expenses', label: 'Gastos',   color: '#ef4444' },
  { key: 'savings',  label: 'Ahorro',   color: '#3b82f6' },
] as const

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5 shadow-md text-sm min-w-[160px]">
      <p className="font-medium text-card-foreground mb-1.5">{label}</p>
      {payload.map(entry => {
        const series = SERIES.find(s => s.key === entry.dataKey)
        return (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4 py-0.5">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span
                className="inline-block h-2 w-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: series?.color }}
              />
              {series?.label}
            </span>
            <span className="font-medium text-card-foreground tabular-nums">
              {formatMoney(entry.value ?? 0, 'CRC')}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function CustomLegend() {
  return (
    <div className="flex justify-center gap-5 pt-2">
      {SERIES.map(s => (
        <span key={s.key} className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
          {s.label}
        </span>
      ))}
    </div>
  )
}

export function MonthlyTotalsChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed border-border py-12 text-sm text-muted-foreground">
        No hay transacciones registradas en los últimos 6 meses.
      </div>
    )
  }

  const formatted: FormattedRow[] = data.map(row => ({
    ...row,
    label: new Intl.DateTimeFormat('es-CR', {
      month: 'short',
      year: '2-digit',
      timeZone: 'UTC',
    }).format(new Date(`${row.month}-01T00:00:00Z`)),
  }))

  return (
    <div className="space-y-2">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={formatted}
          margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
          barCategoryGap="28%"
          barGap={2}
        >
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: 'currentColor' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={v => v === 0 ? '₡0' : `₡${(v / 1000).toFixed(0)}k`}
            tick={{ fontSize: 12, fill: 'currentColor' }}
            axisLine={false}
            tickLine={false}
            width={56}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'oklch(0.556 0 0 / 0.06)', radius: 4 }}
          />
          <Bar dataKey="income"   fill={SERIES[0].color} radius={[4, 4, 0, 0]} maxBarSize={32} />
          <Bar dataKey="expenses" fill={SERIES[1].color} radius={[4, 4, 0, 0]} maxBarSize={32} />
          <Bar dataKey="savings"  fill={SERIES[2].color} radius={[4, 4, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
      <CustomLegend />
    </div>
  )
}
