import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CalendarClock, CircleDollarSign, ListChecks } from 'lucide-react'
import { CreateDebtForm } from '@/components/debts/CreateDebtForm'
import { ConfigureDebtDueDateButton } from '@/components/debts/ConfigureDebtDueDateButton'
import { DeleteDebtButton } from '@/components/debts/DeleteDebtButton'
import { MarkPaidButton } from '@/components/debts/MarkPaidButton'
import { PageHeader } from '@/components/layout/PageHeader'
import { FormDialog } from '@/components/layout/FormDialog'
import { KpiCard } from '@/components/layout/KpiCard'
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
    .select('id, user_id, name, monthly_amount, currency, monthly_amount_crc, total_installments, paid_installments, start_date, next_due_date, due_day, payment_account_id, is_active, created_at')
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
      <PageHeader
        title="Deudas"
        description="Seguimiento de cuotas fijas y compromisos de pago."
        actions={<Link href="/payments" className="text-sm font-medium text-primary underline-offset-4 hover:underline">Ver todos los pagos</Link>}
      />

      <FormDialog triggerLabel="Registrar deuda" title="Nueva deuda" description="Registrá cuotas fijas: leasing, tarjetas a plazo, préstamos.">
        <CreateDebtForm latestExchangeRate={latestExchangeRate} />
      </FormDialog>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <KpiCard
          title="Compromiso mensual"
          description="Cuotas activas en CRC"
          value={formatMoney(summary.totalMonthlyCRC, 'CRC')}
          icon={CalendarClock}
          tone="danger"
        />
        <KpiCard
          title="Total pendiente"
          description="Cuotas restantes × monto"
          value={formatMoney(summary.totalPendingCRC, 'CRC')}
          icon={CircleDollarSign}
          tone="warning"
        />
        <KpiCard
          title="Deudas activas"
          description="Con cuotas pendientes"
          value={summary.activeCount}
          icon={ListChecks}
        />
      </div>

      <div>
        <Card>
          <CardHeader>
            <CardTitle>Deudas registradas</CardTitle>
            <CardDescription>Ordenadas por estado (activas primero).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {projections.length === 0 ? (
              <div className="empty-state">
                No hay deudas registradas todavía.
              </div>
            ) : (
              projections.map(debt => {
                const progress = debt.total_installments > 0
                  ? (debt.paid_installments / debt.total_installments) * 100
                  : 0

                return (
                  <div
                    key={debt.id}
                    className={`list-row ${!debt.is_active ? 'opacity-70' : ''}`}
                  >
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">{debt.name}</p>
                        <span className={debt.is_active ? 'badge-danger' : 'badge-muted'}>
                          {debt.is_active ? 'Activa' : 'Completada'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="tabular-nums">
                          {formatMoney(debt.monthly_amount, debt.currency)}/mes
                          <span className="text-muted-foreground/80">
                            {' '}({formatMoney(debt.monthly_amount_crc, 'CRC')})
                          </span>
                        </span>
                        <span className="tabular-nums">
                          {debt.paid_installments}/{debt.total_installments} cuotas
                        </span>
                        <span>Liberación: {formatDate(debt.releaseDate)}</span>
                        {debt.is_active && debt.next_due_date && <span>Próxima cuota: {formatDate(debt.next_due_date)}</span>}
                        {debt.is_active && !debt.next_due_date && <span>Vencimiento sin configurar</span>}
                      </div>
                      <div className="progress-track max-w-md">
                        <div
                          className={`progress-fill ${progress >= 80 ? 'bg-success' : 'bg-danger'}`}
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                      {debt.is_active && (
                        <p className="text-sm font-semibold tabular-nums text-foreground">
                          Pendiente: {formatMoney(debt.totalPending, 'CRC')}
                        </p>
                      )}
                    </div>
                    {debt.is_active && (
                      <div className="flex shrink-0 flex-wrap gap-2">
                        {debt.next_due_date ? (
                          <MarkPaidButton
                            debtId={debt.id}
                            debtName={debt.name}
                            scheduledDueDate={debt.next_due_date!}
                            paidInstallments={debt.paid_installments}
                            totalInstallments={debt.total_installments}
                          />
                        ) : (
                          <ConfigureDebtDueDateButton debtId={debt.id} debtName={debt.name} />
                        )}
                        <DeleteDebtButton
                          debtId={debt.id}
                          debtName={debt.name}
                          paidInstallments={debt.paid_installments}
                        />
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
