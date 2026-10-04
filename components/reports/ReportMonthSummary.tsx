import { KpiCard } from '@/components/layout/KpiCard'
import { formatMoney } from '@/lib/format'
import { getMonthOverMonthLabel, type MonthlyTotalsRow } from '@/lib/reports'

export function ReportMonthSummary({
  current,
  previous,
}: {
  current?: MonthlyTotalsRow
  previous?: MonthlyTotalsRow
}) {
  const income = current?.income ?? 0
  const expenses = current?.netExpenses ?? 0
  const savings = current?.savings ?? 0
  const netSavings = income - expenses
  const freeBalance = netSavings - savings

  return (
    <section aria-label="Resumen del mes seleccionado" className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground">Resumen del periodo · montos registrados</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiCard title="Ingresos" description="Recibidos en el mes" value={formatMoney(income, 'CRC')} tone="success" />
        <KpiCard
          title="Gastos netos"
          description="Gastos menos reembolsos"
          value={formatMoney(expenses, 'CRC')}
          tone="danger"
          footer={<p className="text-xs text-muted-foreground">{getMonthOverMonthLabel(expenses, previous?.netExpenses ?? null)}</p>}
        />
        <KpiCard
          title="Ahorro neto"
          description="Ingresos menos gastos netos"
          value={formatMoney(netSavings, 'CRC')}
          tone={netSavings < 0 ? 'danger' : 'success'}
          footer={<p className="text-xs text-muted-foreground">{getMonthOverMonthLabel(netSavings, previous ? previous.income - previous.netExpenses : null)}</p>}
        />
        <KpiCard title="Aportes a fondos" description="Ahorro registrado" value={formatMoney(savings, 'CRC')} tone="primary" />
        <KpiCard
          title="Saldo libre"
          description="Ahorro neto menos aportes"
          value={formatMoney(freeBalance, 'CRC')}
          tone={freeBalance < 0 ? 'danger' : 'success'}
        />
      </div>
    </section>
  )
}
