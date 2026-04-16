'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, type TooltipProps } from 'recharts'
import { formatMoney } from '@/lib/format'
import type { CategoryExpense } from '@/lib/reports'

type Props = { data: CategoryExpense[] }

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload as CategoryExpense & { pct: number }
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

export function DashboardDonutChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        Sin gastos registrados.
      </div>
    )
  }

  const total = data.reduce((s, d) => s + d.totalCRC, 0)
  const rows = data.map(d => ({ ...d, pct: total > 0 ? (d.totalCRC / total) * 100 : 0 }))

  return (
    <div className="flex flex-col items-center gap-3">
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={rows}
            dataKey="totalCRC"
            nameKey="categoryName"
            cx="50%"
            cy="50%"
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={2}
          >
            {rows.map((entry) => (
              <Cell key={entry.categoryId} fill={entry.categoryColor} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      {/* Legend: top 4 categories */}
      <div className="w-full space-y-1">
        {rows.slice(0, 4).map(entry => (
          <div key={entry.categoryId} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground min-w-0">
              <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.categoryColor }} />
              <span className="truncate">{entry.categoryName}</span>
            </span>
            <span className="text-card-foreground tabular-nums ml-2">{entry.pct.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
