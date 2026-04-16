'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

type Props = {
  defaultMonth: string  // YYYY-MM
}

const inputClassName =
  'flex h-8 rounded-lg border border-input bg-background px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

export function MonthPicker({ defaultMonth }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentMonth = searchParams.get('month') ?? defaultMonth

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set('month', value)
    } else {
      params.delete('month')
    }
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-muted-foreground">Mes</label>
      <input
        type="month"
        className={inputClassName}
        value={currentMonth}
        onChange={e => handleChange(e.target.value)}
      />
    </div>
  )
}
