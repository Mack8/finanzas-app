import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  getCurrentMonthCR,
  getDashboardSummary,
  getCashFlowBreakdown,
  getMonthlyHistory,
  getMonthlyExpensesByCategory,
  getRecentTransactions,
  buildDashboardInsights,
  getBalanceFromRow,
  type MonthTotals,
} from '@/lib/dashboard'
import { createClient } from '@/lib/supabase/server'
import { formatMoney, formatDate } from '@/lib/format'
import { computeDebtProjection } from '@/lib/debts'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { DashboardAreaChart } from '@/components/dashboard/DashboardAreaChart'
import { DashboardDonutChart } from '@/components/dashboard/DashboardDonutChart'
import { DashboardGauge } from '@/components/dashboard/DashboardGauge'
import { CashFlowCard } from '@/components/dashboard/CashFlowCard'
import { HealthMetrics } from '@/components/dashboard/HealthMetrics'
import { BudgetList } from '@/components/dashboard/BudgetList'
import { RecentTransactions } from '@/components/dashboard/RecentTransactions'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Debt } from '@/types/domain'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { year, month } = getCurrentMonthCR()
  const prevDate = new Date(Date.UTC(year, month - 2, 1))
  const prevYear = prevDate.getUTCFullYear()
  const prevMonth = prevDate.getUTCMonth() + 1
  const daysInMonth = new Date(year, month, 0).getDate()
  const dayOfMonth = Number(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Costa_Rica',
      day: '2-digit',
    }).format(new Date()),
  )

  const [
    summary,
    prevSummary,
    cashFlow,
    monthlyHistory,
    expensesByCategory,
    recentTx,
    { data: savingsFundsData },
    { data: activeDebtsData },
    { data: rateRow },
  ] = await Promise.all([
    getDashboardSummary(supabase, year, month),
    getDashboardSummary(supabase, prevYear, prevMonth),
    getCashFlowBreakdown(supabase, year, month),
    getMonthlyHistory(supabase, 6),
    getMonthlyExpensesByCategory(supabase, year, month),
    getRecentTransactions(supabase, 8),
    supabase
      .from('savings_funds')
      .select('id, name, goal_amount_crc, current_amount_crc, color, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(5),
    supabase
      .from('debts')
      .select('id, user_id, name, monthly_amount, currency, monthly_amount_crc, total_installments, paid_installments, start_date, payment_account_id, is_active, created_at')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(5),
    supabase
      .from('exchange_rates')
      .select('usd_to_crc, date')
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const { totals, budgetProgress, fixedExpenses, variableExpenses, transactionCount } = summary
  const savingsFunds = savingsFundsData ?? []
  const activeDebts = (activeDebtsData ?? []) as Debt[]
  const debtProjections = activeDebts.map(computeDebtProjection)

  const previousTotals: MonthTotals = prevSummary.totals
  const totalSavingsCRC = savingsFunds.reduce((s, f) => s + f.current_amount_crc, 0)
  const totalDebtPendingCRC = debtProjections.reduce((s, d) => s + d.totalPending, 0)
  const activeDebtsMonthlyCRC = debtProjections.reduce((s, d) => s + d.monthly_amount_crc, 0)

  const insights = buildDashboardInsights({
    totals,
    previousTotals,
    fixedExpenses,
    variableExpenses,
    cashFlow,
    dayOfMonth: Math.min(dayOfMonth, daysInMonth),
    daysInMonth,
    exchangeRate: rateRow ? { usd_to_crc: rateRow.usd_to_crc, date: rateRow.date } : null,
    totalSavingsCRC,
    totalDebtPendingCRC,
    activeDebtsMonthlyCRC,
  })

  const monthLabel = new Intl.DateTimeFormat('es-CR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)))

  const historyWithBalance = monthlyHistory.map(r => ({
    ...r,
    balance: getBalanceFromRow(r),
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title={monthLabel}
        description="Vista ejecutiva de tu situación financiera."
        actions={
          insights.exchangeRate ? (
            <div className="rounded-xl border border-border bg-card px-3 py-2 text-right card-shadow">
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                Tipo de cambio BCCR
              </p>
              <p className="font-mono text-sm font-semibold tabular-nums text-foreground">
                ₡{insights.exchangeRate.usd_to_crc.toFixed(2)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {formatDate(insights.exchangeRate.date)}
              </p>
            </div>
          ) : null
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          title="Ingresos"
          value={totals.income}
          metricKey="income"
          history={monthlyHistory}
          mom={insights.mom.income}
          valueClassName="text-success"
        />
        <MetricCard
          title="Gastos"
          value={totals.expenses}
          metricKey="expenses"
          history={monthlyHistory}
          mom={insights.mom.expenses}
          invertDelta
          valueClassName="text-danger"
        />
        <MetricCard
          title="Ahorro (tx)"
          value={totals.savings}
          metricKey="savings"
          history={monthlyHistory}
          mom={insights.mom.savings}
          valueClassName="text-primary"
        />
        <MetricCard
          title="Balance"
          value={totals.balance}
          metricKey="balance"
          history={historyWithBalance}
          mom={insights.mom.balance}
          valueClassName={totals.balance >= 0 ? 'text-success' : 'text-danger'}
          subtitle="Ingresos − gastos − ahorro"
        />
        <MetricCard
          title="Balance ledger"
          value={cashFlow.availableCRC}
          metricKey="none"
          history={monthlyHistory}
          valueClassName={cashFlow.availableCRC >= 0 ? 'text-success' : 'text-danger'}
          subtitle={
            cashFlow.usedSalaryFallback
              ? 'Sin ingresos tx · ver proyección'
              : 'Ingresos − gastos − ahorro'
          }
        />
      </div>

      {/* Health indicators */}
      <HealthMetrics
        rates={insights.rates}
        pace={insights.pace}
        fixedExpenses={fixedExpenses}
        variableExpenses={variableExpenses}
        transactionCount={transactionCount}
        totalSavingsCRC={totalSavingsCRC}
        totalDebtPendingCRC={totalDebtPendingCRC}
        exchangeRate={insights.exchangeRate}
      />

      {/* Charts + cash flow */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Evolución mensual
            </CardTitle>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-success" />Ingresos
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-danger" />Gastos
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <DashboardAreaChart data={monthlyHistory} />
          </CardContent>
        </Card>
        <CashFlowCard cashFlow={cashFlow} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gastos por categoría
            </CardTitle>
            <Link href="/reports" className="text-xs font-medium text-primary hover:underline">
              Reportes
            </Link>
          </CardHeader>
          <CardContent>
            <DashboardDonutChart data={expensesByCategory} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Presupuesto global
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DashboardGauge budgetProgress={budgetProgress} />
            {budgetProgress.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="rounded-lg bg-muted/30 p-2">
                  <p className="text-muted-foreground">Gastado</p>
                  <p className="font-mono font-semibold tabular-nums">
                    {formatMoney(
                      budgetProgress.reduce((s, b) => s + b.spentCRC, 0),
                      'CRC',
                    )}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/30 p-2">
                  <p className="text-muted-foreground">Presupuesto</p>
                  <p className="font-mono font-semibold tabular-nums">
                    {formatMoney(
                      budgetProgress.reduce((s, b) => s + b.budgetCRC, 0),
                      'CRC',
                    )}
                  </p>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <BudgetList items={budgetProgress} />
      </div>

      {/* Savings, debts, recent */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fondos de ahorro
            </CardTitle>
            <Link href="/savings" className="text-xs font-medium text-primary hover:underline">
              Ver todos
            </Link>
          </CardHeader>
          <CardContent>
            {savingsFunds.length === 0 ? (
              <div className="empty-state border-0 bg-transparent p-4">Sin fondos activos.</div>
            ) : (
              <div className="space-y-4">
                {savingsFunds.map(fund => {
                  const pct =
                    fund.goal_amount_crc > 0
                      ? Math.min((fund.current_amount_crc / fund.goal_amount_crc) * 100, 100)
                      : 0
                  return (
                    <div key={fund.id} className="space-y-1.5">
                      <div className="flex justify-between gap-2 text-xs">
                        <span className="flex min-w-0 items-center gap-1.5 font-medium text-card-foreground">
                          <span
                            className="size-2 shrink-0 rounded-full"
                            style={{ backgroundColor: fund.color ?? undefined }}
                          />
                          <span className="truncate">{fund.name}</span>
                        </span>
                        <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                      <div className="progress-track">
                        <div
                          className="progress-fill bg-primary"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: fund.color ?? undefined,
                          }}
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        <span className="font-mono tabular-nums">
                          {formatMoney(fund.current_amount_crc, 'CRC')}
                        </span>
                        {' / '}
                        <span className="font-mono tabular-nums">
                          {formatMoney(fund.goal_amount_crc, 'CRC')}
                        </span>
                      </p>
                    </div>
                  )
                })}
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs">
                  <span className="text-muted-foreground">Total ahorrado · </span>
                  <span className="font-mono font-semibold tabular-nums text-success">
                    {formatMoney(totalSavingsCRC, 'CRC')}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Deudas activas
            </CardTitle>
            <Link href="/debts" className="text-xs font-medium text-primary hover:underline">
              Ver todas
            </Link>
          </CardHeader>
          <CardContent>
            {debtProjections.length === 0 ? (
              <div className="empty-state border-0 bg-transparent p-4">Sin deudas activas.</div>
            ) : (
              <div className="space-y-4">
                {debtProjections.map(debt => {
                  const remaining = debt.remainingInstallments
                  const pct =
                    debt.total_installments > 0
                      ? Math.min((debt.paid_installments / debt.total_installments) * 100, 100)
                      : 0
                  return (
                    <div key={debt.id} className="space-y-1.5">
                      <div className="flex justify-between gap-2 text-xs">
                        <span className="truncate font-medium text-card-foreground">{debt.name}</span>
                        <span className="shrink-0 text-muted-foreground">{remaining} cuotas</span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill bg-danger" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {debt.paid_installments}/{debt.total_installments} ·{' '}
                        <span className="font-mono tabular-nums">
                          {formatMoney(debt.monthly_amount_crc, 'CRC')}
                        </span>
                        /mes · pendiente{' '}
                        <span className="font-mono tabular-nums">
                          {formatMoney(debt.totalPending, 'CRC')}
                        </span>
                      </p>
                    </div>
                  )
                })}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                    <p className="text-muted-foreground">Cuotas/mes</p>
                    <p className="font-mono font-semibold tabular-nums text-danger">
                      {formatMoney(activeDebtsMonthlyCRC, 'CRC')}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                    <p className="text-muted-foreground">Pendiente</p>
                    <p className="font-mono font-semibold tabular-nums">
                      {formatMoney(totalDebtPendingCRC, 'CRC')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <RecentTransactions items={recentTx} />
      </div>
    </div>
  )
}
