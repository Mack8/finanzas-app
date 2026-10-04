import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

const AUTHORITY = 'https://login.microsoftonline.com/consumers/oauth2/v2.0'
const SCOPE = 'Mail.Read offline_access'
const REFRESH_MARGIN_MS = 120_000

export class AuthRequiredError extends Error {
  constructor(message = 'La sesión de Microsoft venció o fue revocada. Corré `npm run worker:login` para iniciar sesión de nuevo.') {
    super(message)
    this.name = 'AuthRequiredError'
  }
}

export type TokenCache = { accessToken: string; refreshToken: string; expiresAt: number }

export interface TokenStore {
  read(): Promise<TokenCache | null>
  write(token: TokenCache): Promise<void>
}

export type AuthIO = {
  fetchFn: typeof fetch
  now: () => number
  sleep: (ms: number) => Promise<void>
  log: (line: string) => void
}

export const defaultIO: AuthIO = {
  fetchFn: fetch,
  now: Date.now,
  sleep: ms => new Promise(resolve => setTimeout(resolve, ms)),
  log: line => console.log(line),
}

export function fileTokenStore(path: string): TokenStore {
  return {
    async read() {
      try {
        const t = JSON.parse(await readFile(path, 'utf8'))
        return typeof t?.accessToken === 'string' && typeof t?.refreshToken === 'string' && typeof t?.expiresAt === 'number'
          ? t
          : null
      } catch {
        return null
      }
    },
    async write(token) {
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, JSON.stringify(token), { mode: 0o600 })
      await chmod(path, 0o600)
    },
  }
}

/** Campos de las respuestas de Microsoft que se usan; el resto se ignora. */
type OAuthResponse = {
  error?: string
  access_token?: string
  refresh_token?: string
  expires_in?: number | string
  device_code?: string
  message?: string
  interval?: number | string
}

async function postForm(io: AuthIO, endpoint: 'devicecode' | 'token', params: Record<string, string>) {
  const res = await io.fetchFn(`${AUTHORITY}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  })
  return { ok: res.ok, json: (await res.json()) as OAuthResponse }
}

function toCache(json: OAuthResponse, io: AuthIO, previousRefresh?: string): TokenCache {
  return {
    accessToken: json.access_token as string,
    refreshToken: (json.refresh_token ?? previousRefresh) as string,
    expiresAt: io.now() + Number(json.expires_in) * 1000,
  }
}

export async function getAccessToken(
  clientId: string,
  store: TokenStore,
  io: AuthIO = defaultIO,
  options: { allowRefresh?: boolean } = {},
): Promise<string> {
  const cached = await store.read()
  if (!cached) throw new AuthRequiredError()
  if (cached.expiresAt - io.now() > REFRESH_MARGIN_MS) return cached.accessToken
  if (options.allowRefresh === false) throw new AuthRequiredError()

  const { ok, json } = await postForm(io, 'token', {
    client_id: clientId,
    grant_type: 'refresh_token',
    refresh_token: cached.refreshToken,
    scope: SCOPE,
  })
  if (!ok) {
    if (json.error === 'invalid_grant') throw new AuthRequiredError()
    throw new Error(`No se pudo refrescar el token de Microsoft: ${json.error ?? 'error desconocido'}`)
  }

  const next = toCache(json, io, cached.refreshToken)
  await store.write(next)
  return next.accessToken
}

export async function loginWithDeviceCode(clientId: string, store: TokenStore, io: AuthIO = defaultIO): Promise<void> {
  const start = await postForm(io, 'devicecode', { client_id: clientId, scope: SCOPE })
  if (!start.ok) throw new Error(`No se pudo iniciar el inicio de sesión: ${start.json.error ?? 'error desconocido'}`)

  io.log(String(start.json.message))
  let intervalMs = Number(start.json.interval ?? 5) * 1000
  const deadline = io.now() + Number(start.json.expires_in) * 1000

  while (io.now() < deadline) {
    await io.sleep(intervalMs)
    const poll = await postForm(io, 'token', {
      client_id: clientId,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      device_code: String(start.json.device_code),
    })
    if (poll.ok) {
      await store.write(toCache(poll.json, io))
      return
    }
    if (poll.json.error === 'authorization_pending') continue
    if (poll.json.error === 'slow_down') { intervalMs += 5000; continue }
    throw new Error(`Inicio de sesión fallido: ${poll.json.error ?? 'error desconocido'}`)
  }
  throw new Error('El código de dispositivo venció. Volvé a correr `npm run worker:login`.')
}
