'use client'

import { formatMoney } from '@/lib/format'
import type { CurrencyCode } from '@/types/database'
import type { MonthlyTotalsRow } from '@/lib/reports'

type MetricKey = 'income' | 'expenses' | 'savings' | 'balance'

type Props = {
  title: string
  value: number | null
  currency?: CurrencyCode
  metricKey: MetricKey
  history: MonthlyTotalsRow[]
  trend?: 'up-good' | 'down-good' | 'neutral'  // for coloring: income/savings up=green, expenses down=good
  valueClassName?: string
}

function Sparkline({ history, metricKey }: { history: MonthlyTotalsRow[]; metricKey: MetricKey }) {
  if (history.length < 2) return null

  const values = history.map(r => {
    if (metricKey === 'balance') return r.income - r.expenses - r.savings
    return r[metricKey]
  })
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const W = 80
  const H = 28
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W
    const y = H - ((v - min) / range) * H
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  return (
    <svg width={W} height={H} className="opacity-60">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

export function SparklineCard({ title, value, currency = 'CRC', metricKey, history, valueClassName }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
        <Sparkline history={history} metricKey={metricKey} />
      </div>
      <p className={`text-xl font-bold tabular-nums ${valueClassName ?? 'text-card-foreground'}`}>
        {value !== null ? formatMoney(value, currency) : '—'}
      </p>
    </div>
  )
}
