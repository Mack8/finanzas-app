import { formatMoney } from '@/lib/format'
import { getSavingsPace } from '@/lib/savings'
import type { SavingsFundWithProgress } from '@/types/domain'
import { cn } from '@/lib/utils'

const pacePresentation = {
  'on-track': { label: 'En ritmo', color: 'text-success', bar: 'var(--success)' },
  'slightly-behind': { label: 'Leve rezago', color: 'text-warning', bar: 'var(--warning)' },
  behind: { label: 'Fuera de ritmo', color: 'text-danger', bar: 'var(--danger)' },
  completed: { label: 'Meta alcanzada', color: 'text-success', bar: 'var(--success)' },
} as const

export function SavingsGoalProgress({ fund, asOf }: { fund: SavingsFundWithProgress; asOf?: Date }) {
  const pace = pacePresentation[getSavingsPace(fund, asOf)]
  const progress = Math.min(Math.max(fund.progressPercent, 0), 100)

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className={cn('font-semibold tabular-nums', pace.color)}>{formatMoney(fund.current_amount_crc, 'CRC')}</span>
        <span className="tabular-nums text-muted-foreground">
          {formatMoney(fund.goal_amount_crc, 'CRC')} ({fund.progressPercent.toFixed(0)}%)
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={Math.min(Math.round(fund.progressPercent), 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progreso ${fund.name}`}
        className="progress-track"
      >
        <div className="progress-fill" style={{ width: `${progress}%`, backgroundColor: pace.bar }} />
      </div>
      <p className={cn('text-xs font-medium', pace.color)}>{pace.label}</p>
      {fund.monthsToGoal !== null && fund.monthsToGoal > 0 && (
        <p className="text-xs text-muted-foreground">
          ~{fund.monthsToGoal} {fund.monthsToGoal === 1 ? 'mes' : 'meses'} para la meta con aporte mensual actual
        </p>
      )}
    </div>
  )
}
