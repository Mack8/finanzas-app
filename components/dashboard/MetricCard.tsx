'use client'

import {
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Scale,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { formatMoney, formatSignedPercent } from '@/lib/format'
import type { CurrencyCode } from '@/types/database'
import type { MonthlyTotalsRow } from '@/lib/reports'
import type { MomChange } from '@/lib/dashboard'
import { cn } from '@/lib/utils'

type MetricKey = 'income' | 'expenses' | 'savings' | 'balance' | 'none'

type Props = {
  title: string
  value: number | null
  currency?: CurrencyCode
  metricKey: MetricKey
  history: MonthlyTotalsRow[]
  mom?: MomChange
  /** For expenses, down is good */
  invertDelta?: boolean
  subtitle?: string
  valueClassName?: string
}

const icons: Record<MetricKey, LucideIcon> = {
  income: TrendingUp,
  expenses: TrendingDown,
  savings: PiggyBank,
  balance: Scale,
  none: Wallet,
}

function Sparkline({
  history,
  metricKey,
  strokeClassName,
}: {
  history: MonthlyTotalsRow[]
  metricKey: Exclude<MetricKey, 'none'>
  strokeClassName: string
}) {
  if (history.length < 2) return null

  const values = history.map(r => {
    if (metricKey === 'balance') return r.income - r.expenses - r.savings
    return r[metricKey]
  })
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const W = 96
  const H = 36
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W
    const y = H - ((v - min) / range) * (H - 4) - 2
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const areaPoints = `0,${H} ${points.join(' ')} ${W},${H}`

  return (
    <svg width={W} height={H} className={cn('overflow-visible', strokeClassName)} aria-hidden="true">
      <polygon points={areaPoints} fill="currentColor" className="opacity-10" />
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function MetricCard({
  title,
  value,
  currency = 'CRC',
  metricKey,
  history,
  mom,
  invertDelta = false,
  subtitle,
  valueClassName,
}: Props) {
  const Icon = icons[metricKey]
  const sparkTone =
    valueClassName?.includes('success')
      ? 'text-success'
      : valueClassName?.includes('danger')
        ? 'text-danger'
        : 'text-primary'

  const deltaPositive = mom ? mom.delta > 0 : false
  const deltaNegative = mom ? mom.delta < 0 : false
  const deltaIsGood = invertDelta ? deltaNegative : deltaPositive
  const deltaIsBad = invertDelta ? deltaPositive : deltaNegative

  return (
    <div className="card-shadow flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-shadow duration-200 hover:card-shadow-hover">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'flex size-9 items-center justify-center rounded-xl',
              valueClassName?.includes('success')
                ? 'bg-success/10 text-success'
                : valueClassName?.includes('danger')
                  ? 'bg-danger/10 text-danger'
                  : 'bg-primary/10 text-primary',
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              {title}
            </p>
            {subtitle ? (
              <p className="text-[11px] text-muted-foreground/80">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {metricKey !== 'none' ? (
          <Sparkline history={history} metricKey={metricKey} strokeClassName={sparkTone} />
        ) : null}
      </div>

      <p className={cn(
        'font-mono text-xl font-semibold tabular-nums tracking-tight sm:text-2xl',
        valueClassName ?? 'text-card-foreground',
      )}>
        {value !== null ? formatMoney(value, currency) : '—'}
      </p>

      {mom ? (
        <div className="flex items-center gap-2 text-xs">
          <span
            className={cn(
              'inline-flex items-center rounded-md px-1.5 py-0.5 font-medium tabular-nums',
              deltaIsGood && 'bg-success/10 text-success',
              deltaIsBad && 'bg-danger/10 text-danger',
              !deltaIsGood && !deltaIsBad && 'bg-muted text-muted-foreground',
            )}
          >
            {formatSignedPercent(mom.percent)}
          </span>
          <span className="text-muted-foreground">vs mes anterior</span>
        </div>
      ) : null}
    </div>
  )
}
