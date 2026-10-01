import { resolveAmountCRC, type ExchangeRateSnapshot } from '@/lib/transactions'
import { externalRef, type ParsedPurchase } from '../types'
import type { LedgerStore } from './store'

export type WriteDeps = {
  userId: string
  store: LedgerStore
  getRate: (date: string) => Promise<ExchangeRateSnapshot | null>
}

export type WriteResult =
  | { status: 'created'; transactionId: string; accountFound: boolean }
  | { status: 'duplicate' }
  | { status: 'retry'; reason: string }

export async function writePurchase(
  p: ParsedPurchase,
  categoryId: string,
  deps: WriteDeps,
): Promise<WriteResult> {
  // occurredAt trae la hora local de Costa Rica: sus primeros 10 caracteres son la fecha local.
  const date = p.occurredAt.slice(0, 10)

  let rate: ExchangeRateSnapshot | null = null
  if (p.currency === 'USD') {
    rate = await deps.getRate(date)
    if (!rate) return { status: 'retry', reason: `Sin tipo de cambio BCCR para ${date}` }
  }
  const { amountCRC, exchangeRateId } = resolveAmountCRC(p.amount, p.currency, rate)

  const accountId = await deps.store.findPaymentAccountId(p.bank, p.cardLast4)

  const result = await deps.store.insertTransaction({
    user_id: deps.userId,
    date,
    description: p.merchant,
    amount: p.amount,
    currency: p.currency,
    amount_crc: amountCRC,
    exchange_rate_id: exchangeRateId,
    category_id: categoryId,
    payment_account_id: accountId,
    transaction_type: 'personal',
    tags: ['email'],
    notes: accountId ? null : `Cuenta no encontrada: ${p.bank} ****${p.cardLast4}`,
    source: 'email',
    external_ref: externalRef(p),
  })

  if (result.status === 'duplicate') return { status: 'duplicate' }
  return { status: 'created', transactionId: result.id, accountFound: accountId !== null }
}
