import Link from 'next/link'
import { formatMoney, formatPercent } from '@/lib/format'
import type { BudgetProgressItem } from '@/lib/dashboard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type Props = {
  items: BudgetProgressItem[]
}

function barTone(pct: number) {
  if (pct >= 100) return 'bg-danger'
  if (pct >= 80) return 'bg-warning'
  return 'bg-success'
}

export function BudgetList({ items }: Props) {
  const top = items.slice(0, 6)

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-sm font-medium text-muted-foreground">Presupuestos</CardTitle>
          <CardDescription>Uso por categoría este mes</CardDescription>
        </div>
        <Link href="/settings" className="text-xs font-medium text-primary hover:underline">
          Configurar
        </Link>
      </CardHeader>
      <CardContent>
        {top.length === 0 ? (
          <div className="empty-state border-0 bg-transparent p-4">
            Sin presupuestos. Definí montos mensuales en categorías.
          </div>
        ) : (
          <div className="space-y-4">
            {top.map(item => {
              const pct = Math.min(item.usedPercent, 100)
              const over = item.usedPercent > 100
              return (
                <div key={item.categoryId} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex min-w-0 items-center gap-1.5 font-medium">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: item.categoryColor }}
                      />
                      <span className="truncate">{item.categoryName}</span>
                    </span>
                    <span
                      className={cn(
                        'shrink-0 font-mono tabular-nums',
                        over ? 'font-semibold text-danger' : 'text-muted-foreground',
                      )}
                    >
                      {formatPercent(item.usedPercent, 0)}
                    </span>
                  </div>
                  <div className="progress-track">
                    <div
                      className={cn('progress-fill', barTone(item.usedPercent))}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    <span className="font-mono tabular-nums">{formatMoney(item.spentCRC, 'CRC')}</span>
                    {' / '}
                    <span className="font-mono tabular-nums">{formatMoney(item.budgetCRC, 'CRC')}</span>
                    {over ? (
                      <span className="ml-1 text-danger">
                        (+{formatMoney(item.spentCRC - item.budgetCRC, 'CRC')})
                      </span>
                    ) : null}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
