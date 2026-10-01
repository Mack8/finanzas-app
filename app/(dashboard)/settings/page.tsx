import { redirect } from 'next/navigation'
import { FolderTree, Eye, Wallet } from 'lucide-react'
import { CreateCategoryForm } from '@/components/settings/CreateCategoryForm'
import { IncomeConfigForm } from '@/components/settings/IncomeConfigForm'
import { DeleteCategoryButton } from '@/components/settings/DeleteCategoryButton'
import { EditCategoryDialog } from '@/components/settings/EditCategoryDialog'
import { IngestIssues, type IngestIssue } from '@/components/settings/IngestIssues'
import { PageHeader } from '@/components/layout/PageHeader'
import { KpiCard } from '@/components/layout/KpiCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { categoryTypeLabels } from '@/lib/categories'
import { formatMoney } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'
import { toggleCategoryStatusAction } from './actions'
import type { Category } from '@/types/domain'

type CategorySummary = Pick<
  Category,
  | 'id'
  | 'name'
  | 'type'
  | 'color'
  | 'monthly_budget_amount'
  | 'monthly_budget_currency'
  | 'is_active'
  | 'sort_order'
>

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [{ data: categoriesData }, { data: txCounts }, { data: incomeConfigRows }] = await Promise.all([
    supabase
      .from('categories')
      .select(`id, name, type, color, monthly_budget_amount, monthly_budget_currency, is_active, sort_order`)
      .eq('user_id', user.id)
      .order('type', { ascending: true })
      .order('sort_order', { ascending: true }),
    supabase
      .from('transactions')
      .select('category_id')
      .eq('user_id', user.id),
    supabase
      .from('income_config')
      .select('id, user_id, first_payment_amount, first_payment_day, second_payment_amount, second_payment_day, currency, effective_from, created_at')
      .eq('user_id', user.id)
      .lte('effective_from', new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Costa_Rica' }).format(new Date()))
      .order('effective_from', { ascending: false })
      .limit(1),
  ])

  const categories = (categoriesData ?? []) as CategorySummary[]

  const { data: issuesData } = await supabase
    .from('email_ingest_log')
    .select('id, created_at, bank, status, subject, detail')
    .eq('user_id', user.id)
    .in('status', ['unparsed', 'error'])
    .order('created_at', { ascending: false })
    .limit(20)
  const ingestIssues = (issuesData ?? []) as IngestIssue[]

  const txCountByCategory = (txCounts ?? []).reduce<Record<string, number>>((acc, tx) => {
    if (tx.category_id) acc[tx.category_id] = (acc[tx.category_id] ?? 0) + 1
    return acc
  }, {})

  const currentIncomeConfig = (incomeConfigRows?.[0] ?? null) as import('@/types/domain').IncomeConfig | null

  const groupedCategories = Object.entries(
    categories.reduce<Record<string, CategorySummary[]>>((accumulator, category) => {
      if (!accumulator[category.type]) {
        accumulator[category.type] = []
      }

      accumulator[category.type].push(category)
      return accumulator
    }, {})
  ) as Array<[Category['type'], CategorySummary[]]>

  const activeCount = categories.filter(category => category.is_active).length
  const inactiveCount = categories.length - activeCount
  const budgetedCount = categories.filter(category => category.monthly_budget_amount !== null).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración"
        description="Gestión de categorías e ingresos mensuales."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard
          title="Total"
          description="Categorías registradas"
          value={categories.length}
          icon={FolderTree}
          tone="primary"
        />
        <KpiCard
          title="Activas"
          description="Disponibles en formularios"
          value={activeCount}
          icon={Eye}
          tone="success"
        />
        <KpiCard
          title="Con presupuesto"
          description={`Inactivas: ${inactiveCount}`}
          value={budgetedCount}
          icon={Wallet}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_1fr]">
        <CreateCategoryForm />

        <Card>
          <CardHeader>
            <CardTitle>Categorías existentes</CardTitle>
            <CardDescription>
              Podés ocultar categorías sin borrar su historial asociado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {groupedCategories.length === 0 ? (
              <div className="empty-state">
                No hay categorías disponibles todavía.
              </div>
            ) : (
              groupedCategories.map(([type, items]) => (
                <section key={type} className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      {categoryTypeLabels[type]}
                    </h3>
                    <span className="badge-muted">
                      {items.filter(item => item.is_active).length} activas
                    </span>
                  </div>

                  <div className="space-y-2">
                    {items.map(category => (
                      <div key={category.id} className="list-row">
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className="inline-flex size-2.5 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
                            <p className="font-medium text-foreground">{category.name}</p>
                            <span className={category.is_active ? 'badge-success' : 'badge-muted'}>
                              {category.is_active ? 'Activa' : 'Inactiva'}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                            <span>Orden {category.sort_order}</span>
                            <span>{categoryTypeLabels[category.type]}</span>
                            {category.monthly_budget_amount !== null && (
                              <span className="tabular-nums">
                                Presupuesto {formatMoney(
                                  category.monthly_budget_amount,
                                  category.monthly_budget_currency
                                )}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2">
                          <EditCategoryDialog category={category} />
                          <DeleteCategoryButton
                            categoryId={category.id}
                            categoryName={category.name}
                            transactionCount={txCountByCategory[category.id] ?? 0}
                          />
                          <form action={toggleCategoryStatusAction}>
                            <input type="hidden" name="categoryId" value={category.id} />
                            <input
                              type="hidden"
                              name="nextActiveState"
                              value={String(!category.is_active)}
                            />
                            <Button type="submit" variant="outline" size="sm">
                              {category.is_active ? 'Desactivar' : 'Activar'}
                            </Button>
                          </form>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Ingresos</h3>
          <p className="text-sm text-muted-foreground">
            Configurá tu salario para calcular el saldo disponible mensual.
          </p>
        </div>
        <IncomeConfigForm currentConfig={currentIncomeConfig} />
      </div>

      <IngestIssues issues={ingestIssues} />
    </div>
  )
}
