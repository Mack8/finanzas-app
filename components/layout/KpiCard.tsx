import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type Tone = 'default' | 'success' | 'danger' | 'warning' | 'primary'

const toneStyles: Record<Tone, { icon: string; value: string }> = {
  default: {
    icon: 'bg-muted text-muted-foreground',
    value: 'text-card-foreground',
  },
  success: {
    icon: 'bg-success/10 text-success',
    value: 'text-success',
  },
  danger: {
    icon: 'bg-danger/10 text-danger',
    value: 'text-danger',
  },
  warning: {
    icon: 'bg-warning/10 text-warning',
    value: 'text-warning',
  },
  primary: {
    icon: 'bg-primary/10 text-primary',
    value: 'text-primary',
  },
}

type Props = {
  title: string
  value: React.ReactNode
  description?: string
  icon?: LucideIcon
  tone?: Tone
  footer?: React.ReactNode
  className?: string
}

export function KpiCard({
  title,
  value,
  description,
  icon: Icon,
  tone = 'default',
  footer,
  className,
}: Props) {
  const styles = toneStyles[tone]

  return (
    <Card size="sm" className={cn('card-shadow', className)}>
      <CardContent className="flex flex-col gap-3 pt-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {title}
            </p>
            {description ? (
              <p className="text-xs text-muted-foreground/80">{description}</p>
            ) : null}
          </div>
          {Icon ? (
            <div
              className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-xl',
                styles.icon,
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
            </div>
          ) : null}
        </div>
        <p className={cn('text-2xl font-semibold tabular-nums tracking-tight', styles.value)}>
          {value}
        </p>
        {footer ? <div className="pt-0.5">{footer}</div> : null}
      </CardContent>
    </Card>
  )
}
