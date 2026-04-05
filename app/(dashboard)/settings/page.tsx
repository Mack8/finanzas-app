import { redirect } from 'next/navigation'
import { CreateCategoryForm } from '@/components/settings/CreateCategoryForm'
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

  const { data: categoriesData } = await supabase
    .from('categories')
    .select(`
      id,
      name,
      type,
      color,
      monthly_budget_amount,
      monthly_budget_currency,
      is_active,
      sort_order
    `)
    .order('type', { ascending: true })
    .order('sort_order', { ascending: true })

  const categories = (categoriesData ?? []) as CategorySummary[]

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
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Configuración</h2>
        <p className="text-muted-foreground">
          Gestión de categorías personalizadas y visibilidad de categorías activas en transacciones.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card size="sm">
          <CardHeader>
            <CardTitle>Total</CardTitle>
            <CardDescription>Categorías registradas</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{categories.length}</p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Activas</CardTitle>
            <CardDescription>Disponibles en formularios</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-success">{activeCount}</p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Con presupuesto</CardTitle>
            <CardDescription>Categorías con monto mensual</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{budgetedCount}</p>
            <p className="mt-1 text-sm text-muted-foreground">Inactivas: {inactiveCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,440px)_1fr]">
        <CreateCategoryForm />

        <Card>
          <CardHeader>
            <CardTitle>Categorías existentes</CardTitle>
            <CardDescription>
              Podés ocultar categorías sin borrar su historial asociado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {groupedCategories.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No hay categorías disponibles todavía.
              </div>
            ) : (
              groupedCategories.map(([type, items]) => (
                <section key={type} className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      {categoryTypeLabels[type]}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {items.filter(item => item.is_active).length} activas
                    </span>
                  </div>

                  <div className="space-y-3">
                    {items.map(category => (
                      <div
                        key={category.id}
                        className="flex flex-col gap-4 rounded-lg border p-4 md:flex-row md:items-start md:justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className="inline-flex h-3 w-3 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
                            <p className="font-medium">{category.name}</p>
                            <span
                              className={
                                category.is_active
                                  ? 'rounded-full bg-success/15 px-2 py-0.5 text-xs text-success'
                                  : 'rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground'
                              }
                            >
                              {category.is_active ? 'Activa' : 'Inactiva'}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                            <span>Orden {category.sort_order}</span>
                            <span>{categoryTypeLabels[category.type]}</span>
                            {category.monthly_budget_amount !== null && (
                              <span>
                                Presupuesto {formatMoney(
                                  category.monthly_budget_amount,
                                  category.monthly_budget_currency
                                )}
                              </span>
                            )}
                          </div>
                        </div>

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
                    ))}
                  </div>
                </section>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
