import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { CreateTransactionForm } from '@/components/transactions/CreateTransactionForm'
import { DeleteTransactionDialog } from '@/components/transactions/DeleteTransactionDialog'
import { EditTransactionDialog } from '@/components/transactions/EditTransactionDialog'
import { RefreshExchangeRateButton } from '@/components/transactions/RefreshExchangeRateButton'
import { TransactionFilters } from '@/components/transactions/TransactionFilters'
import { PageHeader } from '@/components/layout/PageHeader'
import { CreationPanel } from '@/components/layout/CreationPanel'
import { KpiCard } from '@/components/layout/KpiCard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getLatestExchangeRate, isExchangeRateSyncConfigured } from '@/lib/bccr/exchange-rate'
import { formatDate, formatMoney } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'
import { buildTransactionFilters } from '@/lib/transactions'
import { getCurrentMonthCR } from '@/lib/dashboard'
import { computeLedgerTotals } from '@/lib/ledger'
import type { Category, ExchangeRate, Transaction } from '@/types/domain'
import type { CategoryType } from '@/types/database'

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
  | 'payment_account_id'
  | 'source'
> & {
  category: CategoryOption | null
}

type AccountOption = {
  id: string
  name: string
  type: 'credit_card' | 'bank_account'
  last_four: string | null
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
      id, date, description, amount, currency, amount_crc, transaction_type, notes, payment_account_id, source,
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

  const [{ data: categoriesData }, { data: transactionsData }, { data: accountsData }] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name, type, color, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    txQuery,
    supabase
      .from('payment_accounts')
      .select('id, name, type, last_four')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('name'),
  ])

  const categories = (categoriesData ?? []) as CategoryOption[]
  const transactions = (transactionsData ?? []) as unknown as RecentTransaction[]
  const accounts = (accountsData ?? []) as AccountOption[]
  let latestExchangeRate: ExchangeRateInfo | null = null

  try {
    latestExchangeRate = await getLatestExchangeRate({ ensureFresh: true })
  } catch {
    latestExchangeRate = null
  }

  const exchangeRateSyncConfigured = isExchangeRateSyncConfigured()

  const ledgerTotals = computeLedgerTotals(
    transactions.map(t => ({
      amount_crc: t.amount_crc,
      category_type: (t.category?.type ?? 'variable_expense') as CategoryType,
      transaction_type: t.transaction_type,
    })),
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Movimientos"
        description="Registrá y consultá tus movimientos financieros."
      />

      <CreationPanel label="Registrar movimiento">
        <CreateTransactionForm categories={categories} latestExchangeRate={latestExchangeRate} accounts={accounts} />
      </CreationPanel>

      <p className="text-sm text-muted-foreground">Mostrando {transactions.length} movimientos (máximo 50). Los totales corresponden a estos resultados.</p>
      <div className="grid grid-cols-2 gap-3">
        <KpiCard
          title="Ingresos"
          description="De los movimientos mostrados"
          value={formatMoney(ledgerTotals.income, 'CRC')}
          icon={TrendingUp}
          tone="success"
        />
        <KpiCard
          title="Gastos"
          description="De los movimientos mostrados"
          value={formatMoney(ledgerTotals.expenses, 'CRC')}
          icon={TrendingDown}
          tone="danger"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>{latestExchangeRate ? `Venta BCCR: 1 USD = ₡${latestExchangeRate.usd_to_crc.toFixed(2)} · ${formatDate(latestExchangeRate.date)}` : 'Tipo de cambio no disponible. Podés registrar en colones.'}</span>
        {exchangeRateSyncConfigured && <RefreshExchangeRateButton />}
      </div>

      <Suspense fallback={<div className="h-8" />}>
        <TransactionFilters categories={categories} defaultMonth={monthStr} />
      </Suspense>

      <div>
        <Card>
          <CardHeader>
            <CardTitle>Historial</CardTitle>
            <CardDescription>Hasta 50 movimientos según los filtros activos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {transactions.length === 0 ? (
              <div className="empty-state">
                No hay transacciones para el período seleccionado.
              </div>
            ) : (
              transactions.map(transaction => (
                <div key={transaction.id} className="list-row">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="inline-flex size-2.5 rounded-full"
                        style={{ backgroundColor: transaction.category?.color ?? '#6b7280' }}
                      />
                      <p className="font-medium text-foreground">{transaction.description}</p>
                      <span className="badge-muted">
                        {transactionTypeLabels[transaction.transaction_type]}
                      </span>
                      {transaction.source === 'email' && (
                        <span className="badge-muted">Automático</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                      <span>{formatDate(transaction.date)}</span>
                      <span>
                        {transaction.category
                          ? `${categoryTypeLabels[transaction.category.type]} · ${transaction.category.name}`
                          : 'Sin categoría'}
                      </span>
                    </div>
                    {transaction.notes && (
                      <p className="text-sm italic text-muted-foreground">{transaction.notes}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-start gap-3 md:items-end">
                    <div className="space-y-0.5 text-left md:text-right">
                      <p className={`text-base font-semibold tabular-nums ${transaction.category?.type === 'income' ? 'text-success' : transaction.category?.type === 'savings' ? 'text-primary' : 'text-danger'}`}>
                        {formatMoney(transaction.amount, transaction.currency)}
                      </p>
                      <p className="text-sm tabular-nums text-muted-foreground">
                        {formatMoney(transaction.amount_crc, 'CRC')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <EditTransactionDialog
                        transaction={transaction}
                        categories={categories}
                        latestExchangeRate={latestExchangeRate}
                        accounts={accounts}
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
