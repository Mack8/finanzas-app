'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

type CategoryOption = {
  id: string
  name: string
  type: 'fixed_expense' | 'variable_expense' | 'savings' | 'income'
}

type Props = {
  categories: CategoryOption[]
  defaultMonth: string  // YYYY-MM — current month passed from server
}

const selectClassName =
  'flex h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

const categoryTypeLabels: Record<CategoryOption['type'], string> = {
  income: 'Ingreso',
  fixed_expense: 'Gasto fijo',
  variable_expense: 'Gasto variable',
  savings: 'Ahorro',
}

export function TransactionFilters({ categories, defaultMonth }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.replace(`${pathname}?${params.toString()}`)
  }

  const currentMonth = searchParams?.get('month') ?? defaultMonth
  const currentCategoryId = searchParams?.get('categoryId') ?? ''
  const currentType = searchParams?.get('type') ?? ''
  const currentCurrency = searchParams?.get('currency') ?? ''

  return (
    <div className="flex flex-wrap gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Mes</label>
        <input
          type="month"
          className={selectClassName}
          value={currentMonth}
          onChange={e => updateParam('month', e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Categoría</label>
        <select
          className={selectClassName}
          value={currentCategoryId}
          onChange={e => updateParam('categoryId', e.target.value)}
        >
          <option value="">Todas</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>
              {categoryTypeLabels[cat.type]} · {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Tipo</label>
        <select
          className={selectClassName}
          value={currentType}
          onChange={e => updateParam('type', e.target.value)}
        >
          <option value="">Todos</option>
          <option value="personal">Personal</option>
          <option value="household">Hogar</option>
          <option value="reimbursement">Reembolso</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Moneda</label>
        <select
          className={selectClassName}
          value={currentCurrency}
          onChange={e => updateParam('currency', e.target.value)}
        >
          <option value="">Todas</option>
          <option value="CRC">CRC</option>
          <option value="USD">USD</option>
        </select>
      </div>
    </div>
  )
}
