import { formatMoney, formatPercent } from '@/lib/format'
import type { FinancialRates, MonthPace } from '@/lib/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type Props = {
  rates: FinancialRates
  pace: MonthPace
  fixedExpenses: number
  variableExpenses: number
  transactionCount: number
  totalSavingsCRC: number
  totalDebtPendingCRC: number
  exchangeRate: { usd_to_crc: number; date: string } | null
}

function Metric({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string
  hint?: string
  tone?: 'success' | 'danger' | 'warning' | 'default'
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-muted/20 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          'mt-1 font-mono text-lg font-semibold tabular-nums',
          tone === 'success' && 'text-success',
          tone === 'danger' && 'text-danger',
          tone === 'warning' && 'text-warning',
          (!tone || tone === 'default') && 'text-foreground',
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

function savingsTone(rate: number | null): 'success' | 'warning' | 'danger' | 'default' {
  if (rate === null) return 'default'
  if (rate >= 20) return 'success'
  if (rate >= 10) return 'warning'
  return 'danger'
}

function expenseTone(rate: number | null): 'success' | 'warning' | 'danger' | 'default' {
  if (rate === null) return 'default'
  if (rate <= 50) return 'success'
  if (rate <= 80) return 'warning'
  return 'danger'
}

export function HealthMetrics({
  rates,
  pace,
  fixedExpenses,
  variableExpenses,
  transactionCount,
  totalSavingsCRC,
  totalDebtPendingCRC,
  exchangeRate,
}: Props) {
  const overPace =
    pace.projectedExpenses !== null &&
    pace.elapsedPercent > 0 &&
    pace.projectedExpenses > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Indicadores del mes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Tasa de ahorro"
            value={formatPercent(rates.savingsRate)}
            hint="Ahorro / ingresos (tx)"
            tone={savingsTone(rates.savingsRate)}
          />
          <Metric
            label="Tasa de gasto"
            value={formatPercent(rates.expenseRate)}
            hint="Gastos / ingresos (tx)"
            tone={expenseTone(rates.expenseRate)}
          />
          <Metric
            label="Gasto diario"
            value={formatMoney(pace.dailyBurn, 'CRC')}
            hint={`Día ${pace.dayOfMonth} de ${pace.daysInMonth}`}
          />
          <Metric
            label="Proyección de gastos"
            value={pace.projectedExpenses !== null ? formatMoney(pace.projectedExpenses, 'CRC') : '—'}
            hint={overPace ? `Al ritmo actual · ${formatPercent(pace.elapsedPercent, 0)} del mes` : 'Sin datos'}
            tone="warning"
          />
          <Metric
            label="Gastos fijos"
            value={formatMoney(fixedExpenses, 'CRC')}
            hint={rates.fixedShare !== null ? `${formatPercent(rates.fixedShare, 0)} del gasto` : undefined}
          />
          <Metric
            label="Gastos variables"
            value={formatMoney(variableExpenses, 'CRC')}
            hint={rates.variableShare !== null ? `${formatPercent(rates.variableShare, 0)} del gasto` : undefined}
          />
          <Metric
            label="Patrimonio ahorro"
            value={formatMoney(totalSavingsCRC, 'CRC')}
            hint="Suma de fondos activos"
            tone="success"
          />
          <Metric
            label="Deuda pendiente"
            value={formatMoney(totalDebtPendingCRC, 'CRC')}
            hint={exchangeRate ? `USD ${exchangeRate.usd_to_crc.toFixed(2)} · ${transactionCount} movs` : `${transactionCount} movimientos`}
            tone="danger"
          />
        </div>
      </CardContent>
    </Card>
  )
}
