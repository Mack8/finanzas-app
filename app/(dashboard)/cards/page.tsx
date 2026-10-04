import { redirect } from 'next/navigation'
import { CreditCard, Landmark, WalletCards } from 'lucide-react'
import { CreateAccountForm } from '@/components/cards/CreateAccountForm'
import { DeleteAccountButton } from '@/components/cards/DeleteAccountButton'
import { EditAccountDialog } from '@/components/cards/EditAccountDialog'
import { PageHeader } from '@/components/layout/PageHeader'
import { CreationPanel } from '@/components/layout/CreationPanel'
import { KpiCard } from '@/components/layout/KpiCard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import type { PaymentAccount } from '@/types/domain'

const accountTypeLabels: Record<PaymentAccount['type'], string> = {
  credit_card: 'Tarjeta de crédito',
  bank_account: 'Cuenta bancaria',
}

export default async function CardsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: accountsData }, { data: txRows }] = await Promise.all([
    supabase
      .from('payment_accounts')
      .select('id, user_id, name, type, last_four, bank_name, closing_day, payment_due_day, is_active, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('transactions')
      .select('payment_account_id')
      .eq('user_id', user.id)
      .not('payment_account_id', 'is', null),
  ])

  const accounts = (accountsData ?? []) as PaymentAccount[]

  const txCountByAccount = (txRows ?? []).reduce<Record<string, number>>((acc, tx) => {
    if (tx.payment_account_id) acc[tx.payment_account_id] = (acc[tx.payment_account_id] ?? 0) + 1
    return acc
  }, {})

  const totalAccounts = accounts.length
  const creditCards = accounts.filter(a => a.type === 'credit_card').length
  const bankAccounts = accounts.filter(a => a.type === 'bank_account').length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cuentas"
        description="Administrá tus tarjetas de crédito y cuentas bancarias."
      />

      <CreationPanel label="Agregar cuenta"><CreateAccountForm /></CreationPanel>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <KpiCard
          title="Total de cuentas"
          description="Registradas"
          value={totalAccounts}
          icon={WalletCards}
          tone="primary"
        />
        <KpiCard
          title="Tarjetas de crédito"
          description="Registradas"
          value={creditCards}
          icon={CreditCard}
        />
        <KpiCard
          title="Cuentas bancarias"
          description="Registradas"
          value={bankAccounts}
          icon={Landmark}
        />
      </div>

      <div>
        <div className="space-y-4">
          {accounts.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="empty-state">
                  No hay cuentas registradas todavía.
                </div>
              </CardContent>
            </Card>
          ) : (
            accounts.map(account => {
              const txCount = txCountByAccount[account.id] ?? 0
              const isCard = account.type === 'credit_card'
              return (
                <Card
                  key={account.id}
                  style={{
                    borderLeftWidth: 4,
                    borderLeftColor: isCard ? 'var(--chart-5)' : 'var(--primary)',
                  }}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className={`flex size-9 items-center justify-center rounded-xl ${isCard ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400' : 'bg-primary/10 text-primary'}`}>
                            {isCard ? <CreditCard className="size-4" /> : <Landmark className="size-4" />}
                          </div>
                          <CardTitle className="truncate">{account.name}</CardTitle>
                        </div>
                        <CardDescription className="flex flex-wrap gap-2">
                          <span className="badge-muted">
                            {accountTypeLabels[account.type]}
                          </span>
                          {account.bank_name && <span>{account.bank_name}</span>}
                          {account.last_four && (
                            <span className="font-mono tabular-nums">····{account.last_four}</span>
                          )}
                          {account.closing_day && (
                            <span>Cierre: día {account.closing_day}</span>
                          )}
                          {account.payment_due_day && (
                            <span>Pago: día {account.payment_due_day}</span>
                          )}
                        </CardDescription>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <EditAccountDialog account={account} />
                        <DeleteAccountButton
                          accountId={account.id}
                          accountName={account.name}
                          transactionCount={txCount}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  {txCount > 0 && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {txCount} transacción(es) asociada(s)
                      </p>
                    </CardContent>
                  )}
                </Card>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
