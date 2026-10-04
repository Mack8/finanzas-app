import type { SettingsSection } from '@/lib/settings-navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export function SettingsNavigation({ section }: { section: SettingsSection }) {
  const items: { section: SettingsSection; label: string }[] = [
    { section: 'income', label: 'Ingresos' },
    { section: 'categories', label: 'Categorías' },
    { section: 'automation', label: 'Automatización' },
  ]
  return (
    <nav aria-label="Secciones de configuración" className="flex flex-wrap gap-2 border-b pb-4">
      {items.map(item => (
        <Link key={item.section} href={`/settings?section=${item.section}`}
          aria-current={section === item.section ? 'page' : undefined}
          className={cn('rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring',
            section === item.section ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}>
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
