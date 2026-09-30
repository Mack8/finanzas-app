import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MonthPicker } from '@/components/reports/MonthPicker'
import { ExpensesByCategoryChart } from '@/components/reports/ExpensesByCategoryChart'
import { MonthlyTotalsChart } from '@/components/reports/MonthlyTotalsChart'
import { PageHeader } from '@/components/layout/PageHeader'
import { createClient } from '@/lib/supabase/server'
import { getCurrentMonthCR } from '@/lib/dashboard'
import { formatMoney } from '@/lib/format'
import { groupExpensesByCategory, buildMonthlyTotals } from '@/lib/reports'
import type { CategoryType } from '@/types/database'

const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const { year: currentYear, month: currentMonth } = getCurrentMonthCR()
  const defaultMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}`

  const rawMonth = typeof params.month === 'string' ? params.month : defaultMonth
  const monthStr = MONTH_REGEX.test(rawMonth) ? rawMonth : defaultMonth
  const [selYear, selMonth] = monthStr.split('-').map(Number)
  const lastDay = new Date(selYear, selMonth, 0).getDate()
  const dateFrom = `${monthStr}-01`
  const dateTo = `${monthStr}-${String(lastDay).padStart(2, '0')}`

  const d = new Date(Date.UTC(currentYear, currentMonth - 1, 1))
  d.setUTCMonth(d.getUTCMonth() - 5)
  const historyFrom = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`

  const [{ data: categoryTxData }, { data: historyTxData }] = await Promise.all([
    supabase
      .from('transactions')
      .select('amount_crc, category:categories(id, name, type, color)')
      .gte('date', dateFrom)
      .lte('date', dateTo),
    supabase
      .from('transactions')
      .select('amount_crc, date, category:categories(type)')
      .gte('date', historyFrom)
      .order('date', { ascending: true }),
  ])

  type CategoryJoin = { id: string; name: string; type: string; color: string }
  type CategoryTxRow = { amount_crc: number; category: CategoryJoin | null }
  type HistoryTxRow = { amount_crc: number; date: string; category: { type: string } | null }

  const txForCategory = ((categoryTxData ?? []) as unknown as CategoryTxRow[]).flatMap(t => {
    const cat = t.category
    if (!cat) return []
    return [{
      amount_crc: t.amount_crc,
      category_type: cat.type as CategoryType,
      categoryId: cat.id,
      categoryName: cat.name,
      categoryColor: cat.color,
    }]
  })

  const txForHistory = ((historyTxData ?? []) as unknown as HistoryTxRow[]).flatMap(t => {
    const cat = t.category
    if (!cat) return []
    return [{
      amount_crc: t.amount_crc,
      category_type: cat.type as CategoryType,
      month: t.date.slice(0, 7),
    }]
  })

  const categoryExpenses = groupExpensesByCategory(txForCategory)
  const monthlyTotals = buildMonthlyTotals(txForHistory)
  const totalExpenses = categoryExpenses.reduce((s, c) => s + c.totalCRC, 0)

  const monthLabel = new Intl.DateTimeFormat('es-CR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(selYear, selMonth - 1, 1)))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes"
        description="Análisis de tus finanzas personales."
        actions={
          <Suspense>
            <MonthPicker defaultMonth={defaultMonth} />
          </Suspense>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="capitalize">Gastos por categoría — {monthLabel}</CardTitle>
          <CardDescription>
            Total: <span className="font-semibold tabular-nums text-foreground">{formatMoney(totalExpenses, 'CRC')}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ExpensesByCategoryChart data={categoryExpenses} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Evolución mensual</CardTitle>
          <CardDescription>Ingresos, gastos y ahorro de los últimos 6 meses.</CardDescription>
        </CardHeader>
        <CardContent>
          <MonthlyTotalsChart data={monthlyTotals} />
        </CardContent>
      </Card>
    </div>
  )
}
