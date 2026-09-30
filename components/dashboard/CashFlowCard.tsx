import { formatMoney } from '@/lib/format'
import type { CashFlowBreakdown } from '@/lib/dashboard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type Props = {
  cashFlow: CashFlowBreakdown
}

function Row({
  label,
  value,
  tone = 'default',
  strong = false,
  prefix,
}: {
  label: string
  value: number
  tone?: 'default' | 'success' | 'danger' | 'muted'
  strong?: boolean
  prefix?: string
}) {
  return (
    <div className={cn('flex items-center justify-between gap-3 py-2', strong && 'border-t border-border pt-3')}>
      <span className={cn('text-sm', strong ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
        {label}
      </span>
      <span
        className={cn(
          'font-mono text-sm tabular-nums',
          strong && 'text-base font-semibold',
          tone === 'success' && 'text-success',
          tone === 'danger' && 'text-danger',
          tone === 'muted' && 'text-muted-foreground',
          tone === 'default' && 'text-foreground',
        )}
      >
        {prefix ?? ''}
        {formatMoney(Math.abs(value), 'CRC')}
      </span>
    </div>
  )
}

export function CashFlowCard({ cashFlow }: Props) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">Flujo de caja</CardTitle>
        <CardDescription>
          Ledger único · ingresos − gastos − ahorro
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-0.5">
        <Row
          label={cashFlow.usedSalaryFallback ? 'Ingresos (salario config.)' : 'Ingresos (ledger)'}
          value={cashFlow.usedSalaryFallback
            ? (cashFlow.salaryIncomeCRC ?? 0)
            : cashFlow.ledgerIncomeCRC}
          tone="success"
        />
        <Row label="Gastos brutos" value={cashFlow.expensesCRC} tone="danger" prefix="−" />
        {cashFlow.reimbursementsCRC > 0 ? (
          <Row label="Reembolsos" value={cashFlow.reimbursementsCRC} tone="success" prefix="+" />
        ) : null}
        <Row label="Ahorro (tx)" value={cashFlow.savingsCRC} tone="danger" prefix="−" />
        <Row
          label="Balance del mes"
          value={cashFlow.availableCRC}
          tone={cashFlow.availableCRC >= 0 ? 'success' : 'danger'}
          strong
          prefix={cashFlow.availableCRC < 0 ? '−' : undefined}
        />

        {(cashFlow.unpaidDebtsMonthlyCRC > 0
          || cashFlow.pendingPlannedContributionsCRC > 0
          || cashFlow.salaryIncomeCRC !== null) && (
          <div className="mt-3 space-y-0.5 rounded-xl border border-border bg-muted/20 px-3 py-2">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Proyección del mes
            </p>
            {cashFlow.salaryIncomeCRC !== null ? (
              <Row label="Salario configurado" value={cashFlow.salaryIncomeCRC} tone="muted" />
            ) : null}
            {cashFlow.unpaidDebtsMonthlyCRC > 0 ? (
              <Row label="Cuotas aún sin pagar" value={cashFlow.unpaidDebtsMonthlyCRC} tone="danger" prefix="−" />
            ) : null}
            {cashFlow.pendingPlannedContributionsCRC > 0 ? (
              <Row
                label="Aportes planificados pendientes"
                value={cashFlow.pendingPlannedContributionsCRC}
                tone="danger"
                prefix="−"
              />
            ) : null}
            <Row
              label="Saldo proyectado"
              value={cashFlow.projectedAvailableCRC}
              tone={cashFlow.projectedAvailableCRC >= 0 ? 'success' : 'danger'}
              strong
              prefix={cashFlow.projectedAvailableCRC < 0 ? '−' : undefined}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
