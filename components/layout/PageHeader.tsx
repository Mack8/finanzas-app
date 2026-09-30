import { cn } from '@/lib/utils'

type Props = {
  title: string
  description?: string
  className?: string
  actions?: React.ReactNode
}

export function PageHeader({ title, description, className, actions }: Props) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-4', className)}>
      <div className="space-y-1">
        <h2 className="page-title capitalize">{title}</h2>
        {description ? <p className="page-subtitle">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  )
}
