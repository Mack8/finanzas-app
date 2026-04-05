import { redirect } from 'next/navigation'
import { CreateTransactionForm } from '@/components/transactions/CreateTransactionForm'
import { RefreshExchangeRateButton } from '@/components/transactions/RefreshExchangeRateButton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getLatestExchangeRate, isExchangeRateSyncConfigured } from '@/lib/bccr/exchange-rate'
import { formatDate, formatMoney } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'
import type { Category, ExchangeRate, Transaction } from '@/types/domain'

type CategoryOption = Pick<Category, 'id' | 'name' | 'type' | 'color'>

type RecentTransaction = Pick<
  Transaction,
  'id' | 'date' | 'description' | 'amount' | 'currency' | 'amount_crc' | 'transaction_type'
> & {
  category: CategoryOption | null
}

type ExchangeRateInfo = Pick<ExchangeRate, 'id' | 'date' | 'usd_to_crc'>

const categoryTypeLabels: Record<Category['type'], string> = {
  income: 'Ingreso',
  fixed_expense: 'Gasto fijo',
  variable_expense: 'Gasto variable',
  savings: 'Ahorro',
}

const transactionTypeLabels: Record<Transaction['transaction_type'], string> = {
  personal: 'Personal',
  household: 'Hogar',
  reimbursement: 'Reembolso',
}

export default async function TransactionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [{ data: categoriesData }, { data: transactionsData }] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name, type, color, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('transactions')
      .select(`
        id,
        date,
        description,
        amount,
        currency,
        amount_crc,
        transaction_type,
        category:categories (
          id,
          name,
          type,
          color
        )
      `)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(12),
  ])

  const categories = (categoriesData ?? []) as CategoryOption[]
  const transactions = (transactionsData ?? []) as unknown as RecentTransaction[]
  let latestExchangeRate: ExchangeRateInfo | null = null

  try {
    latestExchangeRate = await getLatestExchangeRate({ ensureFresh: true })
  } catch {
    latestExchangeRate = null
  }

  const exchangeRateSyncConfigured = isExchangeRateSyncConfigured()

  const totals = transactions.reduce(
    (accumulator, transaction) => {
      if (transaction.category?.type === 'income') {
        accumulator.income += transaction.amount_crc
      } else {
        accumulator.expense += transaction.amount_crc
      }

      return accumulator
    },
    { income: 0, expense: 0 }
  )

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Transacciones</h2>
        <p className="text-muted-foreground">
          Primer slice de Fase 2: categorías activas, alta de movimientos y historial reciente.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card size="sm">
          <CardHeader>
            <CardTitle>Total reciente</CardTitle>
            <CardDescription>Últimas {transactions.length} transacciones</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{transactions.length}</p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Ingresos</CardTitle>
            <CardDescription>Convertidos a CRC</CardDescription>
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
            <CardDescription>Convertidos a CRC</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-danger">
              {formatMoney(totals.expense, 'CRC')}
            </p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Tipo de cambio</CardTitle>
            <CardDescription>
              {latestExchangeRate
                ? `Venta BCCR ${formatDate(latestExchangeRate.date)}`
                : 'Sin datos'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {latestExchangeRate ? latestExchangeRate.usd_to_crc.toFixed(2) : 'N/D'}
            </p>
            {exchangeRateSyncConfigured ? (
              <div className="mt-3">
                <RefreshExchangeRateButton />
              </div>
            ) : (
              <p className="mt-3 text-sm text-warning">
                Configurá BCCR y `SUPABASE_SERVICE_ROLE_KEY` para sincronizar esta tasa automáticamente.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,440px)_1fr]">
        <CreateTransactionForm
          categories={categories}
          latestExchangeRate={latestExchangeRate}
        />

        <Card>
          <CardHeader>
            <CardTitle>Historial reciente</CardTitle>
            <CardDescription>
              Movimientos más recientes registrados en tu cuenta.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {transactions.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                Todavía no hay transacciones registradas. Creá la primera desde el formulario.
              </div>
            ) : (
              transactions.map(transaction => (
                <div
                  key={transaction.id}
                  className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-start md:justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="inline-flex h-3 w-3 rounded-full"
                        style={{ backgroundColor: transaction.category?.color ?? '#6b7280' }}
                      />
                      <p className="font-medium">{transaction.description}</p>
                    </div>

                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                      <span>{formatDate(transaction.date)}</span>
                      <span>
                        {transaction.category
                          ? `${categoryTypeLabels[transaction.category.type]} · ${transaction.category.name}`
                          : 'Sin categoría'}
                      </span>
                      <span>{transactionTypeLabels[transaction.transaction_type]}</span>
                    </div>
                  </div>

                  <div className="space-y-1 text-left md:text-right">
                    <p className="font-semibold">
                      {formatMoney(transaction.amount, transaction.currency)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatMoney(transaction.amount_crc, 'CRC')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
