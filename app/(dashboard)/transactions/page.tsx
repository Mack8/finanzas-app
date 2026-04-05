import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { CreateTransactionForm } from '@/components/transactions/CreateTransactionForm'
import { DeleteTransactionDialog } from '@/components/transactions/DeleteTransactionDialog'
import { EditTransactionDialog } from '@/components/transactions/EditTransactionDialog'
import { RefreshExchangeRateButton } from '@/components/transactions/RefreshExchangeRateButton'
import { TransactionFilters } from '@/components/transactions/TransactionFilters'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getLatestExchangeRate, isExchangeRateSyncConfigured } from '@/lib/bccr/exchange-rate'
import { formatDate, formatMoney } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'
import { buildTransactionFilters } from '@/lib/transactions'
import { getCurrentMonthCR } from '@/lib/dashboard'
import type { Category, ExchangeRate, Transaction } from '@/types/domain'

type CategoryOption = Pick<Category, 'id' | 'name' | 'type' | 'color'>

type RecentTransaction = Pick<
  Transaction,
  | 'id'
  | 'date'
  | 'description'
  | 'amount'
  | 'currency'
  | 'amount_crc'
  | 'transaction_type'
  | 'notes'
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

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const params = await searchParams
  const { year, month } = getCurrentMonthCR()
  const monthStr = `${year}-${String(month).padStart(2, '0')}`
  const defaultParams = { month: monthStr, ...params }
  const filters = buildTransactionFilters(defaultParams)

  let txQuery = supabase
    .from('transactions')
    .select(`
      id, date, description, amount, currency, amount_crc, transaction_type, notes,
      category:categories ( id, name, type, color )
    `)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50)

  if (filters.dateFrom) txQuery = txQuery.gte('date', filters.dateFrom)
  if (filters.dateTo) txQuery = txQuery.lte('date', filters.dateTo)
  if (filters.categoryId) txQuery = txQuery.eq('category_id', filters.categoryId)
  if (filters.transactionType) txQuery = txQuery.eq('transaction_type', filters.transactionType)
  if (filters.currency) txQuery = txQuery.eq('currency', filters.currency)

  const [{ data: categoriesData }, { data: transactionsData }] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name, type, color, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    txQuery,
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
    (acc, t) => {
      if (t.category?.type === 'income') {
        acc.income += t.amount_crc
      } else {
        acc.expense += t.amount_crc
      }
      return acc
    },
    { income: 0, expense: 0 }
  )

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Transacciones</h2>
        <p className="text-muted-foreground">Registrá y consultá tus movimientos financieros.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card size="sm">
          <CardHeader>
            <CardTitle>Resultados</CardTitle>
            <CardDescription>Transacciones en el período</CardDescription>
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
                Configurá BCCR y `SUPABASE_SERVICE_ROLE_KEY` para sincronizar esta tasa.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Suspense fallback={<div className="h-8" />}>
        <TransactionFilters categories={categories} defaultMonth={monthStr} />
      </Suspense>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,440px)_1fr]">
        <CreateTransactionForm
          categories={categories}
          latestExchangeRate={latestExchangeRate}
        />

        <Card>
          <CardHeader>
            <CardTitle>Historial</CardTitle>
            <CardDescription>Hasta 50 movimientos según los filtros activos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {transactions.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No hay transacciones para el período seleccionado.
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
                    {transaction.notes && (
                      <p className="text-sm text-muted-foreground italic">{transaction.notes}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-start gap-3 md:items-end">
                    <div className="space-y-1 text-left md:text-right">
                      <p className="font-semibold">
                        {formatMoney(transaction.amount, transaction.currency)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatMoney(transaction.amount_crc, 'CRC')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <EditTransactionDialog
                        transaction={transaction}
                        categories={categories}
                        latestExchangeRate={latestExchangeRate}
                      />
                      <DeleteTransactionDialog
                        transactionId={transaction.id}
                        description={transaction.description}
                      />
                    </div>
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
