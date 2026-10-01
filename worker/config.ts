import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { SenderMap } from './graph/mail'
import { BANKS } from './types'

// Next declara NODE_ENV como obligatorio en ProcessEnv; las pruebas pasan objetos parciales.
type Env = Record<string, string | undefined>

export type WorkerConfig = {
  userId: string
  msClientId: string
  ollamaUrl: string
  ollamaModel: string
  pollMinutes: number
  requireAuthPass: boolean
  stateDir: string
  senders: SenderMap
}

export function stateDir(env: Env = process.env): string {
  return env.WORKER_STATE_DIR ?? join(process.cwd(), 'worker', '.state')
}

const defaultReadSenders = () => readFileSync(join(process.cwd(), 'worker', 'senders.json'), 'utf8')

function parseSenders(readSenders: () => string): SenderMap {
  let raw: unknown
  try {
    raw = JSON.parse(readSenders())
  } catch {
    throw new Error('worker/senders.json no existe o no es JSON válido.')
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('worker/senders.json debe ser un objeto { banco: [direcciones] }.')
  }

  const senders = { bac: [], promerica: [], davibank: [] } as SenderMap
  for (const bank of BANKS) {
    const list = (raw as Record<string, unknown>)[bank] ?? []
    if (!Array.isArray(list) || !list.every(a => typeof a === 'string')) {
      throw new Error(`worker/senders.json: "${bank}" debe ser una lista de direcciones.`)
    }
    senders[bank] = list.map(a => a.trim().toLowerCase()).filter(Boolean)
  }
  if (BANKS.every(bank => senders[bank].length === 0)) {
    throw new Error('worker/senders.json debe tener al menos un remitente.')
  }
  return senders
}

export function loadConfig(
  env: Env = process.env,
  readSenders: () => string = defaultReadSenders,
): WorkerConfig {
  const missing = ['WORKER_USER_ID', 'MS_CLIENT_ID'].filter(name => !env[name])
  if (missing.length > 0) throw new Error(`Faltan variables de entorno: ${missing.join(', ')}`)

  const pollMinutes = Number(env.POLL_MINUTES ?? 5)
  if (!Number.isFinite(pollMinutes) || pollMinutes < 1) {
    throw new Error('POLL_MINUTES debe ser un número mayor o igual a 1.')
  }

  return {
    userId: env.WORKER_USER_ID!,
    msClientId: env.MS_CLIENT_ID!,
    ollamaUrl: env.OLLAMA_URL ?? 'http://localhost:11434',
    ollamaModel: env.OLLAMA_MODEL ?? 'qwen3:14b',
    pollMinutes,
    requireAuthPass: env.REQUIRE_AUTH_PASS === 'true',
    stateDir: stateDir(env),
    senders: parseSenders(readSenders),
  }
}
