'use client'

import { useMemo, useState } from 'react'
import { CalendarClock, CreditCard, ReceiptText, TrendingDown } from 'lucide-react'
import { FormDialog } from '@/components/layout/FormDialog'
import { ConfigureDebtDueDateButton } from '@/components/debts/ConfigureDebtDueDateButton'
import { MarkPaidButton } from '@/components/debts/MarkPaidButton'
import { CreateObligationForm } from '@/components/payments/CreateObligationForm'
import { RecordObligationPaymentForm } from '@/components/payments/RecordObligationPaymentForm'
import { DeactivateObligationButton } from '@/components/payments/DeactivateObligationButton'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate, formatMoney } from '@/lib/format'
import type { Debt, PaymentAccount, PaymentReminder, RecurringObligation } from '@/types/domain'

type Filter = 'all' | 'overdue' | 'upcoming' | 'paid'
type CategoryOption = { id: string; name: string; type: 'fixed_expense' | 'variable_expense' }
type AccountOption = Pick<PaymentAccount, 'id' | 'name' | 'last_four'>

const filterOptions: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'overdue', label: 'Vencidos' },
  { value: 'upcoming', label: 'Próximos' },
  { value: 'paid', label: 'Pagados' },
]

function kindLabel(kind: PaymentReminder['kind']) {
  if (kind === 'debt') return 'Cuota de deuda'
  if (kind === 'recurring') return 'Pago recurrente'
  return 'Tarjeta · solo recordatorio'
}

function statusLabel(status: PaymentReminder['status']) {
  if (status === 'overdue') return 'Vencido'
  if (status === 'paid') return 'Pagado'
  return 'Próximo'
}

function statusClass(status: PaymentReminder['status']) {
  if (status === 'overdue') return 'badge-danger'
  if (status === 'paid') return 'badge-success'
  return 'badge-warning'
}

function kindIcon(kind: PaymentReminder['kind']) {
  if (kind === 'debt') return TrendingDown
  if (kind === 'card') return CreditCard
  return ReceiptText
}

export function PaymentsList({
  reminders,
  debts,
  obligations,
  categories,
  accounts,
  latestExchangeRate,
}: {
  reminders: PaymentReminder[]
  debts: Debt[]
  obligations: RecurringObligation[]
  categories: CategoryOption[]
  accounts: AccountOption[]
  latestExchangeRate: { usd_to_crc: number } | null
}) {
  const [filter, setFilter] = useState<Filter>('all')
  const visibleReminders = useMemo(() => reminders
    .filter(reminder => filter === 'all' || reminder.status === filter)
    .toSorted((a, b) => {
      const statusOrder = { overdue: 0, upcoming: 1, paid: 2 }
      const statusDelta = statusOrder[a.status] - statusOrder[b.status]
      if (statusDelta) return statusDelta
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return a.dueDate.localeCompare(b.dueDate)
    }), [filter, reminders])
  const activeObligationById = new Map(obligations.map(obligation => [obligation.id, obligation]))
  const debtById = new Map(debts.map(debt => [debt.id, debt]))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" aria-label="Filtrar pagos">
          {filterOptions.map(option => (
            <Button
              key={option.value}
              type="button"
              variant={filter === option.value ? 'default' : 'outline'}
              size="sm"
              aria-pressed={filter === option.value}
              onClick={() => setFilter(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
        <FormDialog triggerLabel="Nueva obligación" title="Nuevo pago recurrente" description="Servicios, alquiler, suscripciones y otros compromisos periódicos.">
          <CreateObligationForm categories={categories} accounts={accounts} latestExchangeRate={latestExchangeRate} />
        </FormDialog>
      </div>

      {visibleReminders.length === 0 ? (
        <Card><CardContent className="pt-6"><div className="empty-state">No hay pagos en este filtro.</div></CardContent></Card>
      ) : (
        <ul className="space-y-2" aria-label="Lista de pagos">
          {visibleReminders.map(reminder => {
            const Icon = kindIcon(reminder.kind)
            const obligation = reminder.kind === 'recurring' ? activeObligationById.get(reminder.sourceId) : undefined
            const debt = reminder.kind === 'debt' ? debtById.get(reminder.sourceId) : undefined
            const isPending = reminder.status !== 'paid'
            return (
              <li key={reminder.id} aria-label={`${kindLabel(reminder.kind)} · ${reminder.name}`} className="list-row flex-wrap gap-3">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">{reminder.name}</p>
                      <span className={statusClass(reminder.status)}>{statusLabel(reminder.status)}</span>
                      <span className="text-xs text-muted-foreground">{kindLabel(reminder.kind)}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarClock aria-hidden="true" className="size-3.5" />
                        {reminder.dueDate ? formatDate(reminder.dueDate) : 'Fecha por configurar'}
                      </span>
                      {reminder.paidOn && <span>Pagado el {formatDate(reminder.paidOn)}</span>}
                      <span className="font-medium tabular-nums text-foreground">
                        {reminder.amount === null || reminder.currency === null
                          ? 'Monto no disponible'
                          : formatMoney(reminder.amount, reminder.currency)}
                      </span>
                    </div>
                  </div>
                </div>

                {isPending && reminder.kind === 'debt' && debt && (
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {reminder.dueDate ? (
                      <MarkPaidButton debtId={debt.id} debtName={debt.name} scheduledDueDate={reminder.dueDate} paidInstallments={debt.paid_installments} totalInstallments={debt.total_installments} />
                    ) : (
                      <ConfigureDebtDueDateButton debtId={reminder.sourceId} debtName={reminder.name} />
                    )}
                  </div>
                )}

                {isPending && reminder.kind === 'recurring' && obligation && (
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <FormDialog triggerLabel="Registrar pago" title={`Registrar pago · ${obligation.name}`}>
                      <RecordObligationPaymentForm
                        obligationId={obligation.id}
                        scheduledDueDate={reminder.dueDate!}
                        expectedAmount={obligation.expected_amount}
                        currency={obligation.currency}
                        latestExchangeRate={latestExchangeRate}
                      />
                    </FormDialog>
                    <FormDialog triggerLabel="Editar" title={`Editar · ${obligation.name}`}>
                      <CreateObligationForm categories={categories} accounts={accounts} latestExchangeRate={latestExchangeRate} obligation={obligation} />
                    </FormDialog>
                    <DeactivateObligationButton obligationId={obligation.id} name={obligation.name} />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
