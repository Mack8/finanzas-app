import { redirect } from 'next/navigation'
import { PiggyBank, Target, CheckCircle2 } from 'lucide-react'
import { AddContributionDialog } from '@/components/savings/AddContributionDialog'
import { CreateSavingsFundForm } from '@/components/savings/CreateSavingsFundForm'
import { DeleteContributionButton } from '@/components/savings/DeleteContributionButton'
import { SavingsGoalProgress } from '@/components/savings/SavingsGoalProgress'
import { PageHeader } from '@/components/layout/PageHeader'
import { FormDialog } from '@/components/layout/FormDialog'
import { KpiCard } from '@/components/layout/KpiCard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getLatestExchangeRate } from '@/lib/bccr/exchange-rate'
import { formatDate, formatMoney } from '@/lib/format'
import { computeSavingsProgress } from '@/lib/savings'
import { chooseBalancedFinancialColor } from '@/lib/financial-colors'
import { createClient } from '@/lib/supabase/server'
import type { SavingsContribution, SavingsFund } from '@/types/domain'

type ContributionRow = Pick<SavingsContribution, 'id' | 'date' | 'amount' | 'currency' | 'amount_crc' | 'notes' | 'fund_id'>

export default async function SavingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: fundsData }, { data: contribsData }, exchangeRateResult] = await Promise.all([
    supabase
      .from('savings_funds')
      .select('id, user_id, name, goal_amount, goal_currency, goal_amount_crc, current_amount_crc, target_date, monthly_contribution_amount, monthly_contribution_currency, color, is_active, created_at')
      .eq('user_id', user.id)
      .order('is_active', { ascending: false })
      .order('created_at', { ascending: true }),
    supabase
      .from('savings_contributions')
      .select('id, fund_id, date, amount, currency, amount_crc, notes')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false }),
    getLatestExchangeRate({ ensureFresh: true }).catch(() => null),
  ])

  const funds = (fundsData ?? []) as SavingsFund[]
  const contributions = (contribsData ?? []) as ContributionRow[]
  const usdToCRC = exchangeRateResult?.usd_to_crc
  const latestExchangeRate = exchangeRateResult ? { usd_to_crc: exchangeRateResult.usd_to_crc } : null

  const contribsByFund = contributions.reduce<Record<string, ContributionRow[]>>((acc, c) => {
    if (!acc[c.fund_id]) acc[c.fund_id] = []
    acc[c.fund_id].push(c)
    return acc
  }, {})

  const progressFunds = funds.map(f => computeSavingsProgress(f, usdToCRC))

  const totalSavedCRC = funds.reduce((sum, f) => sum + f.current_amount_crc, 0)
  const totalGoalCRC = funds.reduce((sum, f) => sum + f.goal_amount_crc, 0)
  const activeFunds = funds.filter(f => f.is_active).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ahorro"
        description="Fondos de ahorro con metas y seguimiento de aportes."
      />

      <FormDialog triggerLabel="Crear fondo de ahorro" title="Nuevo fondo de ahorro" description="Definí una meta, un plazo y un aporte mensual estimado.">
        <CreateSavingsFundForm
          latestExchangeRate={latestExchangeRate}
          suggestedColor={chooseBalancedFinancialColor(funds.map(fund => fund.color).filter((color): color is string => typeof color === 'string'))}
        />
      </FormDialog>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <KpiCard
          title="Total ahorrado"
          description="Suma de todos los fondos"
          value={formatMoney(totalSavedCRC, 'CRC')}
          icon={PiggyBank}
          tone="success"
        />
        <KpiCard
          title="Total de metas"
          description="Objetivos en CRC"
          value={formatMoney(totalGoalCRC, 'CRC')}
          icon={Target}
          tone="primary"
        />
        <KpiCard
          title="Fondos activos"
          description="Con meta pendiente"
          value={activeFunds}
          icon={CheckCircle2}
        />
      </div>

      <div>
        <div className="space-y-4">
          {progressFunds.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="empty-state">
                  No hay fondos de ahorro registrados todavía.
                </div>
              </CardContent>
            </Card>
          ) : (
            progressFunds.map(fund => {
              const fundContribs = contribsByFund[fund.id] ?? []

              return (
                <Card
                  key={fund.id}
                  className={!fund.is_active ? 'opacity-70' : ''}
                  style={{ borderLeftWidth: 4, borderLeftColor: fund.color ?? '#2563eb' }}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="inline-flex size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: fund.color ?? '#2563eb' }}
                        />
                        <CardTitle className="truncate">{fund.name}</CardTitle>
                        {!fund.is_active && (
                          <span className="badge-success">Completado</span>
                        )}
                      </div>
                      <AddContributionDialog
                        fundId={fund.id}
                        fundName={fund.name}
                        latestExchangeRate={latestExchangeRate}
                      />
                    </div>
                    <CardDescription>
                      Meta: {formatMoney(fund.goal_amount, fund.goal_currency)} para {formatDate(fund.target_date)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <SavingsGoalProgress fund={fund} />

                    {fundContribs.length > 0 && (
                      <div className="space-y-2 border-t border-border pt-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Aportes recientes
                        </p>
                        {fundContribs.slice(0, 5).map(contrib => (
                          <div key={contrib.id} className="flex items-center justify-between gap-2 text-sm">
                            <div className="flex min-w-0 flex-wrap gap-3 text-muted-foreground">
                              <span>{formatDate(contrib.date)}</span>
                              <span className="font-medium tabular-nums text-foreground">
                                {formatMoney(contrib.amount, contrib.currency)}
                              </span>
                              {contrib.notes && <span className="truncate italic">{contrib.notes}</span>}
                            </div>
                            <DeleteContributionButton
                              contributionId={contrib.id}
                              amountLabel={formatMoney(contrib.amount, contrib.currency)}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
