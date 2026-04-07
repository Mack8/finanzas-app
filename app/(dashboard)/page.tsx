import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getCurrentMonthCR, getDashboardSummary, getAvailableBalance } from '@/lib/dashboard'
import { formatMoney } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { year, month } = getCurrentMonthCR()
  const [summary, availableBalance] = await Promise.all([
    getDashboardSummary(supabase, year, month),
    getAvailableBalance(supabase, year, month),
  ])
  const { totals, budgetProgress } = summary

  const monthLabel = new Intl.DateTimeFormat('es-CR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)))

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight capitalize">
          {monthLabel}
        </h2>
        <p className="text-muted-foreground">Resumen financiero del mes actual.</p>
      </div>

      {/* stat cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
        <Card size="sm">
          <CardHeader>
            <CardTitle>Ingresos</CardTitle>
            <CardDescription>Total del mes en CRC</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-success">
              {formatMoney(totals.income, 'CRC')}
            </p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Gastos</CardTitle>
            <CardDescription>Total del mes en CRC</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-danger">
              {formatMoney(totals.expenses, 'CRC')}
            </p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Ahorro</CardTitle>
            <CardDescription>Total del mes en CRC</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {formatMoney(totals.savings, 'CRC')}
            </p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Balance</CardTitle>
            <CardDescription>Ingresos − Gastos − Ahorro</CardDescription>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-semibold ${totals.balance >= 0 ? 'text-success' : 'text-danger'}`}>
              {formatMoney(totals.balance, 'CRC')}
            </p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Saldo disponible</CardTitle>
            <CardDescription>Ingreso − gastos − aportes − deudas</CardDescription>
          </CardHeader>
          <CardContent>
            {availableBalance === null ? (
              <p className="text-sm text-muted-foreground">
                Configurá tu ingreso en Ajustes para ver esta métrica.
              </p>
            ) : (
              <p className={`text-2xl font-semibold ${availableBalance >= 0 ? 'text-success' : 'text-danger'}`}>
                {formatMoney(availableBalance, 'CRC')}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Budget progress */}
      <Card>
        <CardHeader>
          <CardTitle>Progreso de presupuestos</CardTitle>
          <CardDescription>
            Categorías con presupuesto mensual configurado, ordenadas por uso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {budgetProgress.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              No hay categorías con presupuesto configurado. Configuralas en Ajustes.
            </div>
          ) : (
            <div className="space-y-4">
              {budgetProgress.map(item => {
                const barColor =
                  item.usedPercent >= 100
                    ? 'bg-danger'
                    : item.usedPercent >= 80
                    ? 'bg-warning'
                    : 'bg-success'
                const barWidth = `${Math.min(item.usedPercent, 100)}%`

                return (
                  <div key={item.categoryId} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-flex h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: item.categoryColor }}
                        />
                        <span className="font-medium">{item.categoryName}</span>
                      </span>
                      <span className="text-muted-foreground">
                        {formatMoney(item.spentCRC, 'CRC')}
                        {' / '}
                        {formatMoney(item.budgetCRC, 'CRC')}
                        {item.budgetCurrency !== 'CRC' && (
                          <span className="text-xs opacity-70">
                            {' '}(presupuesto: {formatMoney(item.budgetAmount, item.budgetCurrency)})
                          </span>
                        )}
                        {' '}
                        <span className={item.usedPercent >= 100 ? 'text-danger font-semibold' : ''}>
                          ({item.usedPercent.toFixed(0)}%)
                        </span>
                      </span>
                    </div>
                    <div
                      role="progressbar"
                      aria-valuenow={Math.min(Math.round(item.usedPercent), 100)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Presupuesto ${item.categoryName}`}
                      className="h-2 rounded-full bg-muted overflow-hidden"
                    >
                      <div
                        className={`h-2 rounded-full transition-all ${barColor}`}
                        style={{ width: barWidth }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
