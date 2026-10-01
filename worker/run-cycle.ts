import type { Categorization } from './categorizer'
import type { BankMessage } from './graph/mail'
import type { WriteResult } from './ledger-writer/write-purchase'
import { parsePurchase } from './parsers'
import type { CursorStore } from './state/cursor'
import type { IngestLog } from './state/ingest-log'
import type { ParsedPurchase } from './types'

export type CycleDeps = {
  now: () => Date
  cursor: CursorStore
  log: IngestLog
  fetchMessages: (since: string) => Promise<BankMessage[]>
  categorize: (merchant: string, hint: string | null) => Promise<Categorization>
  write: (purchase: ParsedPurchase, categoryId: string) => Promise<WriteResult>
  requireAuthPass: boolean
  initialLookbackDays: number
  report: (line: string) => void
}

export type CycleSummary = {
  created: number
  duplicate: number
  unparsed: number
  skipped: number
  retry: number
  error: number
}

const DAY_MS = 86_400_000

export async function runCycle(deps: CycleDeps): Promise<CycleSummary> {
  const summary: CycleSummary = { created: 0, duplicate: 0, unparsed: 0, skipped: 0, retry: 0, error: 0 }

  const stored = await deps.cursor.read()
  const since = stored ?? new Date(deps.now().getTime() - deps.initialLookbackDays * DAY_MS).toISOString()
  const messages = await deps.fetchMessages(since)

  // Los mensajes vienen en orden ascendente. Tras la primera falla transitoria el cursor
  // deja de avanzar (para no saltar ese correo), pero los demás se siguen procesando:
  // quedan registrados y el siguiente ciclo los omite.
  let blocked = false
  let advanceTo = stored

  for (const m of messages) {
    let advance = true

    try {
      if (await deps.log.isDone(m.id)) {
        summary.skipped++
      } else if (deps.requireAuthPass && m.authPass !== true) {
        const detail = 'Remitente sin autenticación verificada (DMARC)'
        await deps.log.record({ messageId: m.id, bank: m.bank, status: 'unparsed', subject: m.subject, detail })
        summary.unparsed++
        deps.report(`unparsed ${m.bank}: ${detail}`)
      } else {
        const parsed = parsePurchase(m.bank, m.bodyText)
        if (!parsed.ok) {
          await deps.log.record({ messageId: m.id, bank: m.bank, status: 'unparsed', subject: m.subject, detail: parsed.reason })
          summary.unparsed++
          deps.report(`unparsed ${m.bank}: ${parsed.reason}`)
        } else {
          const p = parsed.purchase
          const category = await deps.categorize(p.merchant, p.merchantCategoryHint)
          const result = await deps.write(p, category.categoryId)

          if (result.status === 'retry') {
            summary.retry++
            advance = false
            deps.report(`retry ${m.bank} ${p.merchant}: ${result.reason}`)
          } else if (result.status === 'duplicate') {
            await deps.log.record({ messageId: m.id, bank: m.bank, status: 'duplicate', subject: m.subject })
            summary.duplicate++
            deps.report(`duplicate ${m.bank} ${p.merchant}`)
          } else {
            await deps.log.record({
              messageId: m.id, bank: m.bank, status: 'created', subject: m.subject, transactionId: result.transactionId,
            })
            summary.created++
            const account = result.accountFound ? '' : ' (cuenta no encontrada)'
            deps.report(
              `created ${m.bank} ${p.merchant} ${p.currency} ${p.amount} → ${category.categoryName ?? category.source}${account}`,
            )
          }
        }
      }
    } catch (error) {
      advance = false
      summary.error++
      const detail = error instanceof Error ? error.message : String(error)
      deps.report(`error ${m.bank} ${m.id}: ${detail}`)
      try {
        await deps.log.record({ messageId: m.id, bank: m.bank, status: 'error', subject: m.subject, detail })
      } catch {
        // Si tampoco se puede escribir el registro, el correo se reintenta igual en el siguiente ciclo.
      }
    }

    if (!advance) blocked = true
    if (!blocked) advanceTo = m.receivedAt
  }

  if (advanceTo !== null && advanceTo !== stored) await deps.cursor.write(advanceTo)
  return summary
}
