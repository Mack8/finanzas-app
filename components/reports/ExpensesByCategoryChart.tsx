'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  type TooltipProps,
} from 'recharts'
import { formatMoney } from '@/lib/format'
import type { CategoryExpense } from '@/lib/reports'

type Props = {
  data: CategoryExpense[]
}

type ChartRow = CategoryExpense & { pct: number }

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload as ChartRow
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md text-sm">
      <p className="font-medium text-card-foreground">{row.categoryName}</p>
      <p className="text-muted-foreground mt-0.5">
        {formatMoney(row.totalCRC, 'CRC')}
        <span className="ml-2 text-xs">({row.pct.toFixed(1)}%)</span>
      </p>
    </div>
  )
}

export function ExpensesByCategoryChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed border-border py-12 text-sm text-muted-foreground">
        No hay gastos registrados en este mes.
      </div>
    )
  }

  const total = data.reduce((s, d) => s + d.totalCRC, 0)
  const rows: ChartRow[] = data.map(d => ({
    ...d,
    pct: total > 0 ? (d.totalCRC / total) * 100 : 0,
  }))

  const barHeight = 44
  const chartHeight = Math.max(rows.length * barHeight, 100)

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart
        data={rows}
        layout="vertical"
        margin={{ top: 0, right: 56, bottom: 0, left: 0 }}
        barCategoryGap="30%"
      >
        <XAxis
          type="number"
          hide
        />
        <YAxis
          type="category"
          dataKey="categoryName"
          width={148}
          tick={{ fontSize: 13, fill: 'currentColor' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: 'transparent' }}
        />
        <Bar dataKey="totalCRC" radius={6} maxBarSize={28} background={{ radius: 6, fill: 'transparent' }}>
          {rows.map((entry, index) => (
            <Cell key={index} fill={entry.categoryColor} fillOpacity={0.9} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
