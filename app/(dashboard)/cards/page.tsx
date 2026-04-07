import { redirect } from 'next/navigation'
import { CreateAccountForm } from '@/components/cards/CreateAccountForm'
import { DeleteAccountButton } from '@/components/cards/DeleteAccountButton'
import { EditAccountDialog } from '@/components/cards/EditAccountDialog'
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
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Tarjetas y cuentas</h2>
        <p className="text-muted-foreground">Administrá tus tarjetas de crédito y cuentas bancarias.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card size="sm">
          <CardHeader>
            <CardTitle>Total de cuentas</CardTitle>
            <CardDescription>Registradas en el sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{totalAccounts}</p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Tarjetas de crédito</CardTitle>
            <CardDescription>Registradas</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{creditCards}</p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Cuentas bancarias</CardTitle>
            <CardDescription>Registradas</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{bankAccounts}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,440px)_1fr]">
        <CreateAccountForm />

        <div className="space-y-4">
          {accounts.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                  No hay cuentas registradas todavía.
                </div>
              </CardContent>
            </Card>
          ) : (
            accounts.map(account => {
              const txCount = txCountByAccount[account.id] ?? 0
              return (
                <Card key={account.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle>{account.name}</CardTitle>
                        <CardDescription className="mt-1 flex flex-wrap gap-2">
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                            {accountTypeLabels[account.type]}
                          </span>
                          {account.bank_name && <span>{account.bank_name}</span>}
                          {account.last_four && <span>····{account.last_four}</span>}
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
                      <p className="text-sm text-muted-foreground">{txCount} transacción(es) asociada(s)</p>
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
