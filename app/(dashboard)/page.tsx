import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  getCurrentMonthCR,
  getDashboardSummary,
  getCashFlowBreakdown,
  getMonthlyExpensesByCategory,
} from '@/lib/dashboard'
import { buildCockpit } from '@/lib/dashboard-cockpit'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/format'
import { computeDebtProjection } from '@/lib/debts'
import { DashboardCockpit } from '@/components/dashboard/DashboardCockpit'
import { BudgetList } from '@/components/dashboard/BudgetList'
import { PageHeader } from '@/components/layout/PageHeader'
import type { Debt } from '@/types/domain'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { year, month } = getCurrentMonthCR()
  const daysInMonth = new Date(year, month, 0).getDate()
  const dayOfMonth = Number(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Costa_Rica', day: '2-digit' }).format(new Date()),
  )

  const [summary, cashFlow, expensesByCategory, savingsResult, debtsResult, rateResult] = await Promise.all([
    getDashboardSummary(supabase, year, month),
    getCashFlowBreakdown(supabase, year, month),
    getMonthlyExpensesByCategory(supabase, year, month),
    supabase
      .from('savings_funds')
      .select('id, name, goal_amount_crc, current_amount_crc')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: true }),
    supabase
      .from('debts')
      .select('id, user_id, name, monthly_amount, currency, monthly_amount_crc, total_installments, paid_installments, start_date, payment_account_id, is_active, created_at')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: true }),
    supabase
      .from('exchange_rates')
      .select('usd_to_crc, date')
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])
  if (savingsResult.error || debtsResult.error || rateResult.error) {
    throw new Error('No se pudo cargar la planificación del dashboard. Intentá de nuevo.')
  }

  const model = buildCockpit({
    cashFlow, transactionCount: summary.transactionCount,
    dayOfMonth, daysInMonth, expensesByCategory,
  })
  const debts = ((debtsResult.data ?? []) as Debt[]).map(computeDebtProjection)
  const monthLabel = new Intl.DateTimeFormat('es-CR', {
    month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)))
  const exchangeRate = rateResult.data

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resumen"
        description={`${monthLabel} · Tu margen para decidir hoy y cuidar el resto del mes.`}
        actions={exchangeRate ? (
          <div className="rounded-xl border bg-card px-3 py-2 text-right">
            <p className="text-[11px] text-muted-foreground">Tipo de cambio BCCR</p>
            <p className="font-mono text-sm font-semibold tabular-nums">₡{exchangeRate.usd_to_crc.toFixed(2)}</p>
            <p className="text-[11px] text-muted-foreground">{formatDate(exchangeRate.date)}</p>
          </div>
        ) : null}
      />
      <DashboardCockpit model={model} savingsFunds={savingsResult.data ?? []} debts={debts} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BudgetList items={summary.budgetProgress} />
        <div className="rounded-2xl border bg-card p-5 sm:p-6">
          <h2 className="font-semibold">Entendé tus movimientos</h2>
          <p className="mt-2 text-sm text-muted-foreground">Consultá el detalle del gasto, los gráficos y la evolución mensual en reportes.</p>
          <Link href="/reports" className="mt-4 inline-block text-sm underline underline-offset-4">Explorar reportes →</Link>
          <p className="mt-5 text-xs text-muted-foreground">Las estimaciones usan el ritmo de gasto registrado y el ingreso mensual configurado. Los compromisos se descuentan una vez; registrá o vinculá sus pagos para actualizar el margen.</p>
        </div>
      </div>
    </div>
  )
}
