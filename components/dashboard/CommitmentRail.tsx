import Link from 'next/link'
import { formatDate, formatMoney } from '@/lib/format'
import type { PaymentReminder } from '@/types/domain'

export type SavingsView = { id: string; name: string; current_amount_crc: number; goal_amount_crc: number }
export type DebtView = { id: string; name: string; monthly_amount_crc: number; totalPending: number; paid_installments: number; total_installments: number }

function paymentStatus(status: PaymentReminder['status']) {
  return status === 'overdue' ? 'Vencido' : status === 'paid' ? 'Pagado' : 'Próximo'
}

export function CommitmentRail({ savingsFunds, debts, payments = [] }: { savingsFunds: SavingsView[]; debts: DebtView[]; payments?: PaymentReminder[] }) {
  return (
    <section aria-labelledby="financial-health" className="space-y-4">
      <h2 id="financial-health" className="text-lg font-semibold">Salud financiera</h2>
      <div role="region" aria-label="Próximos pagos" className="rounded-2xl border bg-card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold">Vencimientos</h3>
          <Link href="/payments" className="text-xs underline underline-offset-4">Ver pagos →</Link>
        </div>
        {payments.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No hay vencimientos en los próximos 30 días.</p>
        ) : (
          <ul className="mt-3 divide-y">
            {payments.slice(0, 5).map(payment => (
              <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <p className="break-words text-sm font-medium">{payment.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {payment.dueDate ? formatDate(payment.dueDate) : 'Fecha por configurar'} · {paymentStatus(payment.status)}
                  </p>
                </div>
                <span className="shrink-0 text-right text-sm font-medium tabular-nums">
                  {payment.amount === null || payment.currency === null
                    ? 'Monto no disponible'
                    : formatMoney(payment.amount, payment.currency)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">Fondos de ahorro</h3><Link href="/savings" className="text-xs underline underline-offset-4">Ver fondos →</Link></div>
          <p className="mt-3 break-words font-mono text-2xl font-semibold tabular-nums text-success">{formatMoney(savingsFunds.reduce((sum, fund) => sum + fund.current_amount_crc, 0), 'CRC')}</p>
          <p className="mt-1 text-xs text-muted-foreground">Reservado en tus fondos; no se suma al margen de gasto.</p>
          {savingsFunds.length === 0 ? <p className="mt-5 text-sm text-muted-foreground">Empezá a reservar dinero para tus metas. <Link href="/savings" className="text-primary underline">Crear fondo</Link></p> : (
            <ul className="mt-5 space-y-4">{savingsFunds.map(fund => {
              const progress = fund.goal_amount_crc > 0 ? Math.max(0, Math.min(100, fund.current_amount_crc / fund.goal_amount_crc * 100)) : 0
              return <li key={fund.id}><div className="flex justify-between gap-3 text-sm"><span className="min-w-0 break-words">{fund.name}</span><span className="shrink-0 font-mono text-muted-foreground">{progress.toFixed(0)}%</span></div><div role="progressbar" aria-label={fund.name} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} className="progress-track mt-2"><div className="progress-fill bg-success" style={{ width: `${progress}%` }} /></div><p className="mt-1 text-xs text-muted-foreground">{formatMoney(fund.current_amount_crc, 'CRC')} de {formatMoney(fund.goal_amount_crc, 'CRC')}</p></li>
            })}</ul>
          )}
        </div>
        <div className="rounded-2xl border bg-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">Deudas activas</h3><Link href="/debts" className="text-xs underline underline-offset-4">Ver deudas →</Link></div>
          <p className="mt-3 break-words font-mono text-2xl font-semibold tabular-nums">{formatMoney(debts.reduce((sum, debt) => sum + debt.totalPending, 0), 'CRC')}</p>
          <p className="mt-1 text-xs text-muted-foreground">Total por pagar; el margen reserva solo cuotas pendientes del mes.</p>
          {debts.length === 0 ? <p className="mt-5 text-sm text-muted-foreground">Sin deudas activas. <Link href="/debts" className="underline">Administrar deudas</Link></p> : (
            <ul className="mt-5 space-y-4">{debts.map(debt => <li key={debt.id} className="flex flex-wrap justify-between gap-2 border-t pt-3"><div className="min-w-0 flex-1"><p className="break-words text-sm font-medium">{debt.name}</p><p className="mt-1 text-xs text-muted-foreground">{debt.paid_installments} de {debt.total_installments} cuotas pagadas</p></div><div className="text-right"><p className="font-mono text-sm">{formatMoney(debt.monthly_amount_crc, 'CRC')} / mes</p><p className="mt-1 text-xs text-muted-foreground">Pendiente: {formatMoney(debt.totalPending, 'CRC')}</p></div></li>)}</ul>
          )}
        </div>
      </div>
    </section>
  )
}
