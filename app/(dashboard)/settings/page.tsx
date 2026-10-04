import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FolderTree, Eye, Wallet } from 'lucide-react'
import { CreateCategoryForm } from '@/components/settings/CreateCategoryForm'
import { IncomeConfigForm } from '@/components/settings/IncomeConfigForm'
import { DeleteCategoryButton } from '@/components/settings/DeleteCategoryButton'
import { EditCategoryDialog } from '@/components/settings/EditCategoryDialog'
import { IngestIssues, type IngestIssue } from '@/components/settings/IngestIssues'
import { PageHeader } from '@/components/layout/PageHeader'
import { CreationPanel } from '@/components/layout/CreationPanel'
import { SettingsNavigation } from '@/components/settings/SettingsNavigation'
import { resolveSettingsSection } from '@/lib/settings-navigation'
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

export default async function SettingsPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const section = resolveSettingsSection((await searchParams).section)

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
        description="Elegí la tarea que querés configurar."
      />

      <SettingsNavigation section={section} />

      {section === 'categories' && <>
      <CreationPanel label="Agregar categoría"><CreateCategoryForm /></CreationPanel>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
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

      <div>
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
      </>}

      {section === 'income' && <div className="max-w-2xl space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Ingresos esperados</h2>
          <p className="text-sm text-muted-foreground">
            Ingreso esperado para estimar el mes; no registra dinero recibido.
          </p>
          <Link href="/transactions" className="mt-2 inline-block text-sm text-primary underline underline-offset-4">Registrar un ingreso recibido →</Link>
        </div>
        <IncomeConfigForm currentConfig={currentIncomeConfig} />
      </div>}

      {section === 'automation' && <div className="space-y-4">
        <div>
          <h2 className="font-semibold">Compras desde el correo</h2>
          <p className="mt-1 text-sm text-muted-foreground">Revisá las alertas que no se pudieron registrar. Las compras importadas se identifican como Automático en Movimientos.</p>
          <Link href="/transactions" className="mt-2 inline-block text-sm text-primary underline underline-offset-4">Ver movimientos →</Link>
        </div>
        <IngestIssues issues={ingestIssues} />
      </div>}
    </div>
  )
}
