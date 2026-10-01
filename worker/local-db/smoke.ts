/**
 * Prueba de humo del worker contra la base local (worker/local-db/docker-compose.yml).
 * Usa las capas reales de Supabase, runCycle y Ollama; solo el buzón es simulado.
 *
 *   docker compose -f worker/local-db/docker-compose.yml up -d
 *   npm run worker:smoke
 */
import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { categorize } from '../categorizer'
import { makeOllamaAsk } from '../categorizer/ollama'
import { supabaseCategoryStore } from '../categorizer/store'
import type { BankMessage } from '../graph/mail'
import { supabaseLedgerStore } from '../ledger-writer/store'
import { writePurchase } from '../ledger-writer/write-purchase'
import { merchantKey } from '@/lib/merchant-key'
import { runCycle, type CycleDeps } from '../run-cycle'
import { memoryCursorStore } from '../state/cursor'
import { supabaseIngestLog } from '../state/ingest-log'

const API = 'http://127.0.0.1:54330'
const JWT_SECRET = 'local-test-secret-local-test-secret-32chars'
const USER_A = '00000000-0000-0000-0000-0000000000a1'
const USER_B = '00000000-0000-0000-0000-0000000000b2'

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
function jwt(role: string, sub?: string): string {
  const head = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ role, sub, exp: Math.floor(Date.now() / 1000) + 3600 })}`
  return `${head}.${createHmac('sha256', JWT_SECRET).update(head).digest('base64url')}`
}

// PostgREST sirve en la raíz; supabase-js agrega /rest/v1.
const stripPrefix: typeof fetch = (input, init) => fetch(String(input).replace('/rest/v1/', '/'), init)
const clientFor = (role: string, sub?: string) =>
  createClient<Database>(API, jwt(role, sub), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: stripPrefix },
  })

let failures = 0
function check(name: string, ok: boolean, detail = '') {
  if (!ok) failures++
  console.log(`${ok ? 'OK   ' : 'FALLA'} ${name}${detail ? `  (${detail})` : ''}`)
}

const read = (n: string) => readFileSync(join(__dirname, '..', 'parsers', '__fixtures__', n), 'utf8')
const BAC = read('bac-compra.txt')
const DAVI = read('davibank-compra.txt')
const PROM = read('promerica-compra.txt')

function bac(over: { merchant?: string; amount?: string; card?: string; auth: string; ref: string }): string {
  return BAC.replace('DLC* DIDI FOODS', over.merchant ?? 'DLC* DIDI FOODS')
    .replace('CRC 3,730.00', over.amount ?? 'CRC 3,730.00')
    .replace('************7001', `************${over.card ?? '7001'}`)
    .replace('100001', over.auth)
    .replace('900000000001', over.ref)
}

let n = 0
const msg = (id: string, bank: BankMessage['bank'], bodyText: string): BankMessage => ({
  id, bank, bodyText, receivedAt: `2026-09-29T20:${String(n++).padStart(2, '0')}:00Z`,
  from: `alertas@${bank}.test`, subject: `Alerta ${id}`, authPass: true,
})

const messages: BankMessage[] = [
  msg('m1', 'bac', BAC),
  msg('m2', 'bac', bac({ merchant: 'UBER *TRIP', amount: 'CRC 2,100.00', auth: '100001', ref: '999111222333' })),
  msg('m3', 'promerica', PROM),
  msg('m4', 'davibank', DAVI),
  msg('m5', 'davibank', DAVI.replace('CRC 4,580.00', 'USD 25.99').replace('100002', '384046').replace('900000000002', '626820248866')),
  msg('m6', 'davibank', DAVI.replace('CRC 4,580.00', 'USD 25.99').replace('25/09/2026', '10/01/2026').replace('100002', '384047').replace('900000000002', '626820248867')),
  msg('m7', 'bac', bac({ merchant: 'NETFLIX.COM', card: '7777', auth: '111111', ref: '222222222222' })),
  msg('m8', 'bac', 'Hola, promoción de verano'),
  msg('m9', 'bac', bac({ merchant: 'XQZ 88 TRD SRL', auth: '333333', ref: '444444444444' })),
  msg('m10', 'bac', bac({ merchant: 'PAYPAL *JUAN', auth: '555555', ref: '666666666666' })),
]

async function main() {
  const admin = clientFor('service_role')

  // Estado limpio para el usuario de prueba.
  for (const table of ['email_ingest_log', 'merchant_rules', 'transactions'] as const) {
    const { error } = await admin.from(table).delete().eq('user_id', USER_A)
    if (error) throw new Error(`No se pudo limpiar ${table}: ${error.message}`)
  }

  const { data: cats } = await admin.from('categories').select('id, name').eq('user_id', USER_A)
  const catId = (name: string) => cats?.find(c => c.name === name)?.id as string
  await admin.from('merchant_rules').insert({
    user_id: USER_A, merchant_key: merchantKey('XQZ 88 TRD SRL'), category_id: catId('Compras'),
  })

  const ledger = supabaseLedgerStore(admin, USER_A)
  const store = supabaseCategoryStore(admin, USER_A, { createFallback: true })
  const ask = makeOllamaAsk({ url: process.env.OLLAMA_URL ?? 'http://localhost:11434', model: process.env.OLLAMA_MODEL ?? 'qwen3:14b' })
  const getRate = async (date: string) => {
    const from = new Date(Date.parse(date) - 7 * 86_400_000).toISOString().slice(0, 10)
    const { data } = await admin.from('exchange_rates').select('id, date, usd_to_crc')
      .lte('date', date).gte('date', from).order('date', { ascending: false }).limit(1)
    return data?.[0] ?? null
  }

  const deps: CycleDeps = {
    now: () => new Date('2026-09-30T12:00:00Z'),
    cursor: memoryCursorStore(),
    log: supabaseIngestLog(admin, USER_A),
    fetchMessages: async () => messages,
    categorize: (merchant, hint) => categorize(merchant, hint, { store, ask }),
    write: (p, categoryId) => writePurchase(p, categoryId, { userId: USER_A, store: ledger, getRate }),
    requireAuthPass: false,
    initialLookbackDays: 3,
    report: line => console.log(`   · ${line}`),
  }

  console.log('\n--- Ciclo 1')
  const s1 = await runCycle(deps)
  check('ciclo 1: 8 creadas, 1 reintento (USD sin tasa), 1 no reconocido',
    s1.created === 8 && s1.retry === 1 && s1.unparsed === 1 && s1.error === 0, JSON.stringify(s1))

  const { data: txs } = await admin.from('transactions')
    .select('description, amount, currency, amount_crc, date, source, external_ref, tags, transaction_type, payment_account_id, notes, category:categories(name)')
    .eq('user_id', USER_A)
  const byDesc = (d: string) => txs?.find(t => t.description === d)
  const catName = (d: string) => (byDesc(d)?.category as unknown as { name: string } | null)?.name

  check('8 transacciones en la base', txs?.length === 8, String(txs?.length))
  const t1 = byDesc('DLC* DIDI FOODS')
  check('campos del ledger de la compra BAC', !!t1 && t1.amount_crc === 3730 && t1.date === '2026-09-29' && t1.source === 'email'
    && t1.external_ref === 'bac:100001:900000000001' && t1.tags?.[0] === 'email' && t1.transaction_type === 'personal'
    && t1.payment_account_id !== null && t1.notes === null)
  check('misma autorización con distinta referencia: dos compras', byDesc('UBER *TRIP') !== undefined && t1 !== undefined)
  check('categoría por modelo: DIDI FOODS → Alimentación', catName('DLC* DIDI FOODS') === 'Alimentación', catName('DLC* DIDI FOODS'))
  check('categoría por modelo: UBER → Transporte', catName('UBER *TRIP') === 'Transporte', catName('UBER *TRIP'))
  check('categoría por regla aprendida (gana al modelo): XQZ → Compras', catName('XQZ 88 TRD SRL') === 'Compras', catName('XQZ 88 TRD SRL'))
  check('comercio irreconocible → Sin categorizar (creada en el momento)', catName('PAYPAL *JUAN') === 'Sin categorizar', catName('PAYPAL *JUAN'))
  const usd = txs?.find(t => t.currency === 'USD')
  check('USD convertido con la tasa del 2026-09-25', !!usd && Math.abs(usd.amount_crc - 25.99 * 505.25) < 0.02, String(usd?.amount_crc))
  const noAcc = byDesc('NETFLIX.COM')
  check('tarjeta sin cuenta: se crea sin cuenta y se anota', !!noAcc && noAcc.payment_account_id === null && noAcc.notes === 'Cuenta no encontrada: bac ****7777')
  const prom = byDesc('TACO BELL CITY MALL ALAJUELA CRI')
  check('Promerica: cuenta encontrada por banco y últimos 4', !!prom && prom.payment_account_id !== null)

  const { data: log1 } = await admin.from('email_ingest_log').select('message_id, status, detail').eq('user_id', USER_A)
  check('registro: 8 created + 1 unparsed, el reintento (m6) no se registra',
    log1?.filter(l => l.status === 'created').length === 8 && log1?.find(l => l.message_id === 'm8')?.status === 'unparsed'
    && !log1?.some(l => l.message_id === 'm6'), `${log1?.length} filas`)

  console.log('\n--- Ciclo 2 (mismos correos)')
  const s2 = await runCycle(deps)
  const { count: c2 } = await admin.from('transactions').select('*', { count: 'exact', head: true }).eq('user_id', USER_A)
  check('ciclo 2: todo omitido, solo el reintento pendiente, sin duplicar', s2.skipped === 9 && s2.created === 0 && s2.retry === 1 && c2 === 8, `${JSON.stringify(s2)} filas=${c2}`)

  console.log('\n--- Ciclo 3 (se borra el registro de m1: el índice único debe frenar el duplicado)')
  await admin.from('email_ingest_log').delete().eq('user_id', USER_A).eq('message_id', 'm1')
  const s3 = await runCycle(deps)
  const { count: c3 } = await admin.from('transactions').select('*', { count: 'exact', head: true }).eq('user_id', USER_A)
  check('ciclo 3: m1 queda como duplicate y no se inserta de nuevo', s3.duplicate === 1 && s3.created === 0 && c3 === 8, `${JSON.stringify(s3)} filas=${c3}`)

  console.log('\n--- RLS')
  const a = clientFor('authenticated', USER_A)
  const b = clientFor('authenticated', USER_B)
  for (const table of ['transactions', 'email_ingest_log', 'merchant_rules'] as const) {
    const { data: asA } = await a.from(table).select('id')
    const { data: asB } = await b.from(table).select('id')
    check(`${table}: A ve lo suyo (${asA?.length}), B no ve nada`, (asA?.length ?? 0) > 0 && asB?.length === 0)
  }
  const { error: logInsert } = await a.from('email_ingest_log').insert({ user_id: USER_A, message_id: 'x', status: 'error' })
  check('el usuario no puede escribir en email_ingest_log (solo el worker)', logInsert !== null, logInsert?.code)
  const { error: ruleOk } = await a.from('merchant_rules')
    .upsert({ user_id: USER_A, merchant_key: 'UBER TRIP', category_id: catId('Transporte') }, { onConflict: 'user_id,merchant_key' })
  check('el usuario puede guardar su regla (flujo de corrección de categoría)', ruleOk === null, ruleOk?.message)
  const { error: ruleForeign } = await b.from('merchant_rules')
    .insert({ user_id: USER_A, merchant_key: 'HACK', category_id: catId('Compras') })
  check('otro usuario no puede crear reglas a nombre de A', ruleForeign !== null, ruleForeign?.code)

  console.log(failures === 0 ? '\nTodo correcto.' : `\n${failures} verificación(es) fallaron.`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
