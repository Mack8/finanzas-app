import { redirect } from 'next/navigation'
import { getCurrentMonthCR, getDashboardSummary, getAvailableBalance, getMonthlyHistory, getMonthlyExpensesByCategory } from '@/lib/dashboard'
import { createClient } from '@/lib/supabase/server'
import { SparklineCard } from '@/components/dashboard/SparklineCard'
import { DashboardAreaChart } from '@/components/dashboard/DashboardAreaChart'
import { DashboardDonutChart } from '@/components/dashboard/DashboardDonutChart'
import { DashboardGauge } from '@/components/dashboard/DashboardGauge'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { year, month } = getCurrentMonthCR()
  const [summary, availableBalance, monthlyHistory, expensesByCategory, { data: savingsFundsData }, { data: activeDebtsData }] = await Promise.all([
    getDashboardSummary(supabase, year, month),
    getAvailableBalance(supabase, year, month),
    getMonthlyHistory(supabase, 6),
    getMonthlyExpensesByCategory(supabase, year, month),
    supabase.from('savings_funds').select('id, name, goal_amount_crc, current_amount_crc, color, is_active').eq('user_id', user.id).eq('is_active', true).order('created_at', { ascending: true }).limit(4),
    supabase.from('debts').select('id, name, monthly_amount_crc, total_installments, paid_installments, start_date').eq('user_id', user.id).eq('is_active', true).order('created_at', { ascending: true }).limit(4),
  ])
  const { totals, budgetProgress } = summary
  const savingsFunds = savingsFundsData ?? []
  const activeDebts = activeDebtsData ?? []

  const monthLabel = new Intl.DateTimeFormat('es-CR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)))

  return (
    <div className="space-y-6">
      {/* Month heading */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight capitalize">{monthLabel}</h2>
        <p className="text-muted-foreground text-sm">Resumen financiero del mes actual.</p>
      </div>

      {/* Row 1: 5 KPI sparkline cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
        <SparklineCard title="Ingresos" value={totals.income} metricKey="income" history={monthlyHistory} valueClassName="text-success" />
        <SparklineCard title="Gastos" value={totals.expenses} metricKey="expenses" history={monthlyHistory} valueClassName="text-danger" />
        <SparklineCard title="Ahorro" value={totals.savings} metricKey="savings" history={monthlyHistory} />
        <SparklineCard
          title="Balance"
          value={totals.balance}
          metricKey="balance"
          history={monthlyHistory}
          valueClassName={totals.balance >= 0 ? 'text-success' : 'text-danger'}
        />
        <SparklineCard
          title="Saldo disponible"
          value={availableBalance}
          metricKey="income"
          history={monthlyHistory}
          valueClassName={availableBalance !== null && availableBalance >= 0 ? 'text-success' : 'text-danger'}
        />
      </div>

      {/* Row 2: Area chart + Donut chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Area chart — 2/3 */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4 card-shadow">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Evolución mensual</h3>
          <DashboardAreaChart data={monthlyHistory} />
          {/* Legend */}
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-success" />Ingresos
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-danger" />Gastos
            </span>
          </div>
        </div>
        {/* Donut — 1/3 */}
        <div className="rounded-xl border border-border bg-card p-4 card-shadow">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Gastos por categoría</h3>
          <DashboardDonutChart data={expensesByCategory} />
        </div>
      </div>

      {/* Row 3: Gauge + Savings + Debts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Gauge */}
        <div className="rounded-xl border border-border bg-card p-4 card-shadow">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Presupuesto global</h3>
          <DashboardGauge budgetProgress={budgetProgress} />
        </div>

        {/* Savings progress */}
        <div className="rounded-xl border border-border bg-card p-4 card-shadow">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Fondos de ahorro</h3>
          {savingsFunds.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin fondos activos.</p>
          ) : (
            <div className="space-y-3">
              {savingsFunds.map(fund => {
                const pct = fund.goal_amount_crc > 0 ? Math.min((fund.current_amount_crc / fund.goal_amount_crc) * 100, 100) : 0
                return (
                  <div key={fund.id} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-card-foreground font-medium">
                        <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: fund.color ?? undefined }} />
                        {fund.name}
                      </span>
                      <span className="text-muted-foreground">{pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Debts timeline */}
        <div className="rounded-xl border border-border bg-card p-4 card-shadow">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Deudas activas</h3>
          {activeDebts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin deudas activas.</p>
          ) : (
            <div className="space-y-3">
              {activeDebts.map(debt => {
                const remaining = debt.total_installments - debt.paid_installments
                const pct = debt.total_installments > 0 ? Math.min((debt.paid_installments / debt.total_installments) * 100, 100) : 0
                return (
                  <div key={debt.id} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-card-foreground font-medium truncate max-w-[120px]">{debt.name}</span>
                      <span className="text-muted-foreground ml-2">{remaining} cuotas</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-1.5 rounded-full bg-danger transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
