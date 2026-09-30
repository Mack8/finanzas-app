import Link from 'next/link'
import { formatDate, formatMoney } from '@/lib/format'
import type { RecentTransactionItem } from '@/lib/dashboard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type Props = {
  items: RecentTransactionItem[]
}

export function RecentTransactions({ items }: Props) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Movimientos recientes
          </CardTitle>
          <CardDescription>Últimas transacciones registradas</CardDescription>
        </div>
        <Link href="/transactions" className="text-xs font-medium text-primary hover:underline">
          Ver todas
        </Link>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="empty-state border-0 bg-transparent p-4">
            Todavía no hay movimientos.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map(tx => {
              const isIncome = tx.categoryType === 'income'
              const isSavings = tx.categoryType === 'savings'
              return (
                <li key={tx.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex items-center gap-3">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: tx.categoryColor ?? '#94a3b8' }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {tx.description}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatDate(tx.date)}
                        {tx.categoryName ? ` · ${tx.categoryName}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={cn(
                        'font-mono text-sm font-semibold tabular-nums',
                        isIncome && 'text-success',
                        isSavings && 'text-primary',
                        !isIncome && !isSavings && 'text-danger',
                      )}
                    >
                      {isIncome ? '+' : '−'}
                      {formatMoney(tx.amount, tx.currency)}
                    </p>
                    {tx.currency !== 'CRC' ? (
                      <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
                        {formatMoney(tx.amount_crc, 'CRC')}
                      </p>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
