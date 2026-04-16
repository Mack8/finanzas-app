import { redirect } from 'next/navigation'
import { CreateDebtForm } from '@/components/debts/CreateDebtForm'
import { DeleteDebtButton } from '@/components/debts/DeleteDebtButton'
import { MarkPaidButton } from '@/components/debts/MarkPaidButton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getLatestExchangeRate } from '@/lib/bccr/exchange-rate'
import { computeDebtProjection, computeDebtsSummary } from '@/lib/debts'
import { formatDate, formatMoney } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'
import type { Debt } from '@/types/domain'

export default async function DebtsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: debtsData } = await supabase
    .from('debts')
    .select('id, user_id, name, monthly_amount, currency, monthly_amount_crc, total_installments, paid_installments, start_date, payment_account_id, is_active, created_at')
    .eq('user_id', user.id)
    .order('is_active', { ascending: false })
    .order('created_at', { ascending: true })

  const debts = (debtsData ?? []) as Debt[]
  const projections = debts.map(computeDebtProjection)
  const summary = computeDebtsSummary(projections)

  let latestExchangeRate: { usd_to_crc: number } | null = null
  try {
    latestExchangeRate = await getLatestExchangeRate({ ensureFresh: true })
  } catch {
    latestExchangeRate = null
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Deudas</h2>
        <p className="text-muted-foreground">Seguimiento de cuotas fijas y compromisos de pago.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card size="sm">
          <CardHeader>
            <CardTitle>Compromiso mensual</CardTitle>
            <CardDescription>Suma de cuotas activas en CRC</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-danger">
              {formatMoney(summary.totalMonthlyCRC, 'CRC')}
            </p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Total pendiente</CardTitle>
            <CardDescription>Cuotas restantes × monto CRC</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatMoney(summary.totalPendingCRC, 'CRC')}</p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Deudas activas</CardTitle>
            <CardDescription>Con cuotas pendientes</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{summary.activeCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,440px)_1fr]">
        <CreateDebtForm latestExchangeRate={latestExchangeRate} />

        <Card>
          <CardHeader>
            <CardTitle>Deudas registradas</CardTitle>
            <CardDescription>Ordenadas por estado (activas primero).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {projections.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No hay deudas registradas todavía.
              </div>
            ) : (
              projections.map(debt => (
                <div
                  key={debt.id}
                  className={`flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-start md:justify-between ${!debt.is_active ? 'opacity-60' : ''}`}
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{debt.name}</p>
                      <span className={debt.is_active
                        ? 'rounded-full bg-danger/15 px-2 py-0.5 text-xs text-danger'
                        : 'rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground'}>
                        {debt.is_active ? 'Activa' : 'Completada'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span>{formatMoney(debt.monthly_amount, debt.currency)}/mes ({formatMoney(debt.monthly_amount_crc, 'CRC')})</span>
                      <span className="text-xs text-muted-foreground">{debt.paid_installments}/{debt.total_installments} cuotas</span>
                      <span>Liberación: {formatDate(debt.releaseDate)}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full ${(debt.paid_installments / debt.total_installments) >= 0.8 ? 'bg-success' : 'bg-danger'}`}
                        style={{ width: `${Math.min((debt.paid_installments / debt.total_installments) * 100, 100)}%` }}
                      />
                    </div>
                    {debt.is_active && (
                      <p className="text-sm font-medium">
                        Pendiente: {formatMoney(debt.totalPending, 'CRC')}
                      </p>
                    )}
                  </div>
                  {debt.is_active && (
                    <div className="flex flex-wrap gap-2">
                      <MarkPaidButton
                        debtId={debt.id}
                        debtName={debt.name}
                        paidInstallments={debt.paid_installments}
                        totalInstallments={debt.total_installments}
                      />
                      <DeleteDebtButton
                        debtId={debt.id}
                        debtName={debt.name}
                        paidInstallments={debt.paid_installments}
                      />
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
