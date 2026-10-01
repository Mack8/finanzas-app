import type { CurrencyCode } from '@/types/database'

export type Bank = 'bac' | 'promerica' | 'davibank'

export const BANKS: Bank[] = ['bac', 'promerica', 'davibank']

export type ParsedPurchase = {
  bank: Bank
  merchant: string
  /** Rubro que el banco informa del comercio (Promerica: "Tipo de Comercio"). */
  merchantCategoryHint: string | null
  /** ISO con offset -06:00: la hora local de Costa Rica tal como aparece en el correo. */
  occurredAt: string
  cardLast4: string
  authorization: string
  reference: string
  amount: number
  currency: CurrencyCode
}

export type ParseResult =
  | { ok: true; purchase: ParsedPurchase }
  | { ok: false; reason: string }

export type MailMessage = {
  id: string
  receivedAt: string
  from: string
  subject: string
  bodyText: string
  /** true si Authentication-Results trae dmarc=pass; null si el encabezado no está. */
  authPass: boolean | null
}

/** Clave única de una compra: banco + autorización + referencia. */
export function externalRef(p: Pick<ParsedPurchase, 'bank' | 'authorization' | 'reference'>): string {
  return `${p.bank}:${p.authorization}:${p.reference}`
}
