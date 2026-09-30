'use client'

import type { BudgetProgressItem } from '@/lib/dashboard'

type Props = { budgetProgress: BudgetProgressItem[] }

export function DashboardGauge({ budgetProgress }: Props) {
  const totalSpent = budgetProgress.reduce((s, b) => s + b.spentCRC, 0)
  const totalBudget = budgetProgress.reduce((s, b) => s + b.budgetCRC, 0)
  const pct = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0

  const r = 80
  const cx = 100
  const cy = 100
  const circumference = Math.PI * r
  const filled = (pct / 100) * circumference

  const color = pct >= 90 ? 'var(--danger)' : pct >= 70 ? 'var(--warning)' : 'var(--success)'
  const label =
    pct >= 90 ? 'Sobre el límite' : pct >= 70 ? 'Cerca del límite' : 'Dentro del presupuesto'

  if (budgetProgress.length === 0) {
    return (
      <div className="empty-state flex h-36 items-center justify-center border-0 bg-transparent p-4">
        Sin presupuesto configurado.
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <svg viewBox="0 0 200 120" className="w-full max-w-[220px]">
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="14"
          strokeLinecap="round"
          className="text-muted opacity-40"
        />
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
        />
        <text
          x={cx}
          y={cy - 10}
          textAnchor="middle"
          fill="currentColor"
          className="text-foreground"
          fontSize="30"
          fontWeight="700"
        >
          {pct.toFixed(0)}%
        </text>
        <text
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          fill="currentColor"
          className="text-muted-foreground"
          fontSize="11"
        >
          del presupuesto
        </text>
      </svg>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  )
}
