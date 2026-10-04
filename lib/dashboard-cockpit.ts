import { computeFinancialPosition, type CashFlowBreakdown, type FinancialPosition } from './dashboard'
import type { CategoryExpense } from './reports'
import { roundMoney } from './transactions'
import { formatMoney } from './format'

export type CockpitModel = {
  position: FinancialPosition
  remainingExpensesCRC: number
  action: { title: string; reason: string; impact: string; href: string }
  evidence: { pace: string; driver: string; commitments: string }
}

export function buildCockpit({ cashFlow, transactionCount, dayOfMonth, daysInMonth, expensesByCategory }: {
  cashFlow: CashFlowBreakdown
  transactionCount: number
  dayOfMonth: number
  daysInMonth: number
  expensesByCategory: CategoryExpense[]
}): CockpitModel {
  const day = Math.min(Math.max(dayOfMonth, 1), daysInMonth)
  const horizonDays = daysInMonth - day + 1
  const remainingExpensesCRC = roundMoney(cashFlow.expensesCRC / day * horizonDays)
  // Monthly configured income is an estimate, not a next-payment calendar.
  const futureIncomeCRC = cashFlow.salaryIncomeCRC === null
    ? null
    : Math.max(0, roundMoney(cashFlow.salaryIncomeCRC - cashFlow.ledgerIncomeCRC))
  const position = computeFinancialPosition({
    confirmedCRC: cashFlow.availableCRC,
    pendingCommitmentsCRC: cashFlow.unpaidDebtsMonthlyCRC + cashFlow.pendingPlannedContributionsCRC,
    futureIncomeCRC, horizonDays, projectedExpensesCRC: remainingExpensesCRC,
  })
  if (transactionCount === 0 && position.state !== 'risk') position.state = 'incomplete'
  if (position.safeCRC === 0 && position.state === 'stable') position.state = 'attention'

  let action: CockpitModel['action']
  if (position.state === 'risk') {
    action = {
      title: 'Revisá lo que tenés comprometido',
      reason: 'El saldo registrado no alcanza para cubrir los compromisos pendientes.',
      impact: `Faltan ${formatMoney(-position.safeCRC, 'CRC')} para cubrir el periodo.`,
      href: cashFlow.unpaidDebtsMonthlyCRC > 0 ? '/debts' : cashFlow.pendingPlannedContributionsCRC > 0 ? '/savings' : '/transactions',
    }
  } else if (position.state === 'attention' && remainingExpensesCRC === 0) {
    action = {
      title: 'Revisá tu saldo antes de gastar',
      reason: 'Los compromisos reservados dejan el margen seguro en cero.',
      impact: 'Registrá los ingresos recibidos o revisá tus compromisos antes de asumir nuevos gastos.',
      href: '/transactions',
    }
  } else if (position.state === 'attention') {
    action = {
      title: 'Ajustá tu ritmo de gasto',
      reason: 'Si seguís al ritmo actual, el gasto restante supera tu margen seguro.',
      impact: `Reducí ${formatMoney(remainingExpensesCRC - position.safeCRC, 'CRC')} del gasto estimado hasta fin de mes.`,
      href: '/transactions',
    }
  } else if (position.state === 'incomplete') {
    action = transactionCount === 0 ? {
      title: 'Registrá tus ingresos y movimientos',
      reason: 'La planificación sola no confirma cuánto dinero tenés disponible.',
      impact: 'Tu primer movimiento permite empezar a evaluar el periodo.',
      href: '/transactions',
    } : {
      title: 'Configurá tus ingresos del mes',
      reason: 'Conocemos el saldo registrado, pero falta el ingreso esperado para proyectar.',
      impact: 'La proyección es una estimación; no aumenta el dinero disponible hoy.',
      href: '/settings',
    }
  } else {
    action = {
      title: 'Mantené tu gasto dentro del límite diario',
      reason: 'El ritmo actual cabe en tu margen después de reservar los compromisos.',
      impact: `Referencia diaria: ${formatMoney(position.dailySafeCRC, 'CRC')} hasta fin de mes.`,
      href: '/transactions',
    }
  }

  const driver = [...expensesByCategory].sort((a, b) => b.totalCRC - a.totalCRC)[0]
  const totalExpenses = expensesByCategory.reduce((sum, category) => sum + category.totalCRC, 0)
  return {
    position, action, remainingExpensesCRC,
    evidence: {
      pace: transactionCount === 0 ? 'Sin movimientos registrados' : `${formatMoney(remainingExpensesCRC, 'CRC')} estimados hasta fin de mes`,
      driver: driver && totalExpenses > 0 ? `${driver.categoryName} · ${(driver.totalCRC / totalExpenses * 100).toFixed(0)}% del gasto` : 'Sin gastos registrados',
      commitments: formatMoney(position.pendingCommitmentsCRC, 'CRC'),
    },
  }
}
