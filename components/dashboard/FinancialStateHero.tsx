import type { FinancialPosition } from '@/lib/dashboard'
import { formatMoney } from '@/lib/format'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export function FinancialStateHero({ position }: { position: FinancialPosition }) {
  const label = position.state === 'risk'
    ? 'Entrás en zona de riesgo'
    : position.state === 'attention'
      ? position.safeCRC === 0 ? 'No tenés margen para nuevos gastos' : 'Vas por encima del ritmo'
      : position.state === 'incomplete'
        ? 'Faltan datos para proyectar'
        : 'Podés gastar con tranquilidad'

  return (
    <section aria-labelledby="financial-state" data-state={position.state} className="rounded-2xl border bg-card p-5 card-shadow sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="financial-state" className={cn('text-sm font-semibold',
          position.state === 'stable' && 'text-success',
          position.state === 'attention' && 'text-warning',
          position.state === 'risk' && 'text-danger',
          position.state === 'incomplete' && 'text-muted-foreground',
        )}>{label}</h2>
        <p className="rounded-full border px-3 py-1 text-xs text-muted-foreground">Horizonte: fin de mes</p>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Margen seguro</p>
          <p className={cn('mt-2 break-words font-mono text-3xl font-bold tracking-tight tabular-nums sm:text-5xl', position.safeCRC < 0 && 'text-danger')}>
            {formatMoney(position.safeCRC, 'CRC')}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            {position.safeCRC <= 0 ? 'No hay margen para nuevos gastos.' : `${formatMoney(position.dailySafeCRC, 'CRC')} por día durante ${position.horizonDays} días, incluido hoy.`}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">Saldo del mes menos {formatMoney(position.pendingCommitmentsCRC, 'CRC')} en compromisos pendientes.</p>
        </div>
        <dl className="grid gap-4 rounded-xl border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-1">
          <div><dt className="text-xs text-muted-foreground">Confirmado hoy</dt><dd className="mt-1 break-words font-mono text-lg font-semibold">{formatMoney(position.confirmedCRC, 'CRC')}</dd><dd className="mt-1 text-xs text-muted-foreground">Ingresos − gastos − ahorro registrados este mes.</dd></div>
          <div><dt className="text-xs text-muted-foreground">Proyectado</dt><dd className="mt-1 break-words font-mono text-lg font-semibold">{position.projectedCRC === null ? <Link href="/settings" className="text-sm text-primary underline underline-offset-4">Configurá ingresos</Link> : formatMoney(position.projectedCRC, 'CRC')}</dd><dd className="mt-1 text-xs text-muted-foreground">Margen + ingreso configurado aún sin registrar. Estimación sin fecha de cobro; no disponible hoy.</dd></div>
        </dl>
      </div>
    </section>
  )
}
