'use client'

import type { BudgetProgressItem } from '@/lib/dashboard'

type Props = { budgetProgress: BudgetProgressItem[] }

export function DashboardGauge({ budgetProgress }: Props) {
  const totalSpent = budgetProgress.reduce((s, b) => s + b.spentCRC, 0)
  const totalBudget = budgetProgress.reduce((s, b) => s + b.budgetCRC, 0)
  const pct = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0

  // SVG semicircle: viewBox 0 0 200 110, r=80, cx=100, cy=100
  const r = 80
  const cx = 100
  const cy = 100
  const circumference = Math.PI * r  // half circle = πr
  const filled = (pct / 100) * circumference

  // Color: green <70, amber 70-90, red >90
  const color = pct >= 90 ? 'oklch(0.60 0.22 25)' : pct >= 70 ? 'oklch(0.70 0.15 55)' : 'oklch(0.65 0.18 142)'

  if (budgetProgress.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        Sin presupuesto configurado.
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 110" className="w-full max-w-[200px]">
        {/* Background arc */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="16"
          strokeLinecap="round"
          className="text-muted opacity-30"
        />
        {/* Filled arc */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke={color}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
        />
        {/* Center text */}
        <text x={cx} y={cy - 8} textAnchor="middle" className="fill-current text-foreground" fontSize="28" fontWeight="bold">
          {pct.toFixed(0)}%
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" className="fill-current text-muted-foreground" fontSize="11">
          del presupuesto
        </text>
      </svg>
    </div>
  )
}
