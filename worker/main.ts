import { join } from 'node:path'
import { getExchangeRateForDate, toExchangeRateSnapshot } from '@/lib/bccr/exchange-rate'
import { createAdminClient } from '@/lib/supabase/admin'
import { categorize } from './categorizer'
import { makeOllamaAsk } from './categorizer/ollama'
import { supabaseCategoryStore } from './categorizer/store'
import { loadConfig } from './config'
import { AuthRequiredError, defaultIO, fileTokenStore, getAccessToken } from './graph/auth'
import { fetchBankMessages } from './graph/mail'
import { supabaseLedgerStore } from './ledger-writer/store'
import { writePurchase, type WriteResult } from './ledger-writer/write-purchase'
import { runCycle, type CycleDeps, type CycleSummary } from './run-cycle'
import { fileCursorStore, memoryCursorStore } from './state/cursor'
import { memoryIngestLog, supabaseIngestLog } from './state/ingest-log'

try { process.loadEnvFile('.env.local') } catch { /* sin .env.local: se usan las variables del entorno */ }

const EXIT_AUTH_REQUIRED = 78
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

function summaryLine(s: CycleSummary): string {
  return `ciclo: ${s.created} creadas, ${s.duplicate} duplicadas, ${s.unparsed} no reconocidas, ${s.skipped} omitidas, ${s.retry} por reintentar, ${s.error} con error`
}

async function main() {
  const args = process.argv.slice(2)
  const dry = args.includes('--dry-run')
  const once = dry || args.includes('--once')
  const daysIndex = args.indexOf('--days')
  const days = daysIndex >= 0 ? Number(args[daysIndex + 1]) : 3
  if (!Number.isFinite(days) || days < 1) throw new Error('--days debe ser un número mayor o igual a 1.')

  const cfg = loadConfig()
  const supabase = createAdminClient()

  const tokenStore = fileTokenStore(join(cfg.stateDir, 'token.json'))
  const ledger = supabaseLedgerStore(supabase, cfg.userId)
  const getRate = async (date: string) =>
    toExchangeRateSnapshot(await getExchangeRateForDate(date, { ensureFresh: true }))
  const categories = supabaseCategoryStore(supabase, cfg.userId, { createFallback: !dry })
  const ask = makeOllamaAsk({ url: cfg.ollamaUrl, model: cfg.ollamaModel })

  // En dry-run se lee todo (buzón, cuentas, tasas, reglas) pero no se escribe nada.
  const write = dry
    ? async (p: Parameters<CycleDeps['write']>[0]): Promise<WriteResult> => {
        if (p.currency === 'USD' && !(await getRate(p.occurredAt.slice(0, 10)))) {
          return { status: 'retry', reason: `Sin tipo de cambio BCCR para ${p.occurredAt.slice(0, 10)}` }
        }
        const accountId = await ledger.findPaymentAccountId(p.bank, p.cardLast4)
        return { status: 'created', transactionId: 'dry-run', accountFound: accountId !== null }
      }
    : (p: Parameters<CycleDeps['write']>[0], categoryId: string) =>
        writePurchase(p, categoryId, { userId: cfg.userId, store: ledger, getRate })

  const deps: CycleDeps = {
    now: () => new Date(),
    cursor: dry ? memoryCursorStore() : fileCursorStore(join(cfg.stateDir, 'cursor.json')),
    log: dry ? memoryIngestLog() : supabaseIngestLog(supabase, cfg.userId),
    fetchMessages: async since =>
      fetchBankMessages(await getAccessToken(cfg.msClientId, tokenStore, defaultIO), since, cfg.senders),
    categorize: (merchant, hint) => categorize(merchant, hint, { store: categories, ask }),
    write,
    requireAuthPass: cfg.requireAuthPass,
    initialLookbackDays: days,
    report: line => console.log(`${dry ? '[dry-run] ' : ''}${line}`),
  }

  console.log(`Worker de ingesta iniciado${dry ? ' (dry-run: no escribe nada)' : ''}. Modelo: ${cfg.ollamaModel}.`)

  let failures = 0
  for (;;) {
    try {
      console.log(summaryLine(await runCycle(deps)))
      failures = 0
    } catch (error) {
      if (error instanceof AuthRequiredError) {
        console.error(error.message)
        process.exit(EXIT_AUTH_REQUIRED)
      }
      failures++
      console.error(`Ciclo fallido: ${error instanceof Error ? error.message : String(error)}`)
    }

    if (once) process.exit(failures > 0 ? 1 : 0)

    const waitMs = failures === 0 ? cfg.pollMinutes * 60_000 : Math.min(30_000 * 2 ** (failures - 1), 600_000)
    await sleep(waitMs)
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
