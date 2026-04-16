import { redirect } from 'next/navigation'
import { AddContributionDialog } from '@/components/savings/AddContributionDialog'
import { CreateSavingsFundForm } from '@/components/savings/CreateSavingsFundForm'
import { DeleteContributionButton } from '@/components/savings/DeleteContributionButton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getLatestExchangeRate } from '@/lib/bccr/exchange-rate'
import { formatDate, formatMoney } from '@/lib/format'
import { computeSavingsProgress } from '@/lib/savings'
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
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Ahorro</h2>
        <p className="text-muted-foreground">Fondos de ahorro con metas y seguimiento de aportes.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card size="sm">
          <CardHeader>
            <CardTitle>Total ahorrado</CardTitle>
            <CardDescription>Suma de todos los fondos en CRC</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-success">{formatMoney(totalSavedCRC, 'CRC')}</p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Total de metas</CardTitle>
            <CardDescription>Suma de objetivos en CRC</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatMoney(totalGoalCRC, 'CRC')}</p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Fondos activos</CardTitle>
            <CardDescription>Con meta pendiente</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{activeFunds}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,440px)_1fr]">
        <CreateSavingsFundForm latestExchangeRate={latestExchangeRate} />

        <div className="space-y-4">
          {progressFunds.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                  No hay fondos de ahorro registrados todavía.
                </div>
              </CardContent>
            </Card>
          ) : (
            progressFunds.map(fund => {
              const barWidth = `${Math.min(fund.progressPercent, 100)}%`
              const fundContribs = contribsByFund[fund.id] ?? []

              return (
                <Card key={fund.id} className={!fund.is_active ? 'opacity-60' : ''} style={{ borderColor: fund.color ? fund.color + '40' : undefined }}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex h-3 w-3 flex-shrink-0 rounded-full"
                          style={{ backgroundColor: fund.color ?? '#3b82f6' }}
                        />
                        <CardTitle>{fund.name}</CardTitle>
                        {!fund.is_active && (
                          <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs text-success">Completado</span>
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
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{formatMoney(fund.current_amount_crc, 'CRC')}</span>
                        <span className="text-muted-foreground">
                          {formatMoney(fund.goal_amount_crc, 'CRC')} ({fund.progressPercent.toFixed(0)}%)
                        </span>
                      </div>
                      <div
                        role="progressbar"
                        aria-valuenow={Math.min(Math.round(fund.progressPercent), 100)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Progreso ${fund.name}`}
                        className="h-2 overflow-hidden rounded-full bg-muted"
                      >
                        <div className="h-2 rounded-full transition-all" style={{ width: barWidth, backgroundColor: fund.color ?? '#3b82f6' }} />
                      </div>
                      {fund.monthsToGoal !== null && fund.monthsToGoal > 0 && (
                        <p className="text-xs text-muted-foreground">
                          ~{fund.monthsToGoal} {fund.monthsToGoal === 1 ? 'mes' : 'meses'} para la meta con aporte mensual actual
                        </p>
                      )}
                    </div>

                    {fundContribs.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Aportes recientes</p>
                        {fundContribs.slice(0, 5).map(contrib => (
                          <div key={contrib.id} className="flex items-center justify-between gap-2 text-sm">
                            <div className="flex flex-wrap gap-3 text-muted-foreground">
                              <span>{formatDate(contrib.date)}</span>
                              <span>{formatMoney(contrib.amount, contrib.currency)}</span>
                              {contrib.notes && <span className="italic">{contrib.notes}</span>}
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
