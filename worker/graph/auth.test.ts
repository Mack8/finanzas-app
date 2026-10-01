// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { AuthRequiredError, getAccessToken, loginWithDeviceCode, type AuthIO, type TokenCache, type TokenStore } from './auth'

function memoryStore(initial: TokenCache | null = null): TokenStore & { value: TokenCache | null } {
  const s: TokenStore & { value: TokenCache | null } = {
    value: initial,
    read: async () => s.value,
    write: async t => { s.value = t },
  }
  return s
}

function json(body: unknown, ok = true) {
  return { ok, json: async () => body } as Response
}

function makeIO(fetchFn: typeof fetch, now = 1_000_000): AuthIO & { slept: number[]; lines: string[] } {
  const io: AuthIO & { slept: number[]; lines: string[] } = {
    fetchFn, now: () => now, slept: [], lines: [],
    sleep: async ms => { io.slept.push(ms) },
    log: l => { io.lines.push(l) },
  }
  return io
}

describe('getAccessToken', () => {
  it('lanza AuthRequiredError si no hay sesión guardada', async () => {
    await expect(getAccessToken('cid', memoryStore(), makeIO(vi.fn()))).rejects.toBeInstanceOf(AuthRequiredError)
  })

  it('devuelve el token guardado si falta más de 2 minutos para vencer', async () => {
    const fetchFn = vi.fn()
    const store = memoryStore({ accessToken: 'A', refreshToken: 'R', expiresAt: 1_000_000 + 300_000 })
    expect(await getAccessToken('cid', store, makeIO(fetchFn))).toBe('A')
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('refresca el token cuando está por vencer y guarda el nuevo', async () => {
    const fetchFn = vi.fn().mockResolvedValue(json({ access_token: 'A2', refresh_token: 'R2', expires_in: 3600 }))
    const store = memoryStore({ accessToken: 'A', refreshToken: 'R', expiresAt: 1_000_000 + 60_000 })
    expect(await getAccessToken('cid', store, makeIO(fetchFn))).toBe('A2')
    expect(store.value).toEqual({ accessToken: 'A2', refreshToken: 'R2', expiresAt: 1_000_000 + 3_600_000 })
    const [url, init] = fetchFn.mock.calls[0]
    expect(url).toBe('https://login.microsoftonline.com/consumers/oauth2/v2.0/token')
    expect(String(init.body)).toContain('grant_type=refresh_token')
    expect(String(init.body)).toContain('refresh_token=R')
  })

  it('conserva el refresh token anterior si la respuesta no trae uno nuevo', async () => {
    const fetchFn = vi.fn().mockResolvedValue(json({ access_token: 'A2', expires_in: 3600 }))
    const store = memoryStore({ accessToken: 'A', refreshToken: 'R', expiresAt: 0 })
    await getAccessToken('cid', store, makeIO(fetchFn))
    expect(store.value?.refreshToken).toBe('R')
  })

  it('lanza AuthRequiredError si el refresh token fue revocado', async () => {
    const fetchFn = vi.fn().mockResolvedValue(json({ error: 'invalid_grant' }, false))
    const store = memoryStore({ accessToken: 'A', refreshToken: 'R', expiresAt: 0 })
    await expect(getAccessToken('cid', store, makeIO(fetchFn))).rejects.toBeInstanceOf(AuthRequiredError)
  })

  it('lanza un error común (reintentable) ante otras fallas', async () => {
    const fetchFn = vi.fn().mockResolvedValue(json({ error: 'temporarily_unavailable' }, false))
    const store = memoryStore({ accessToken: 'A', refreshToken: 'R', expiresAt: 0 })
    const err = await getAccessToken('cid', store, makeIO(fetchFn)).catch(e => e)
    expect(err).toBeInstanceOf(Error)
    expect(err).not.toBeInstanceOf(AuthRequiredError)
  })
})

describe('loginWithDeviceCode', () => {
  const deviceCode = { device_code: 'DC', user_code: 'ABC123', message: 'Andá a https://microsoft.com/devicelogin e ingresá ABC123', interval: 5, expires_in: 900 }

  it('muestra el mensaje, espera la autorización y guarda los tokens', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(json(deviceCode))
      .mockResolvedValueOnce(json({ error: 'authorization_pending' }, false))
      .mockResolvedValueOnce(json({ access_token: 'A', refresh_token: 'R', expires_in: 3600 }))
    const store = memoryStore()
    const io = makeIO(fetchFn)
    await loginWithDeviceCode('cid', store, io)
    expect(io.lines[0]).toContain('ABC123')
    expect(io.slept).toEqual([5000, 5000])
    expect(store.value).toEqual({ accessToken: 'A', refreshToken: 'R', expiresAt: 1_000_000 + 3_600_000 })
    expect(String(fetchFn.mock.calls[2][1].body)).toContain('device_code=DC')
  })

  it('espera más cuando Microsoft pide bajar la frecuencia', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(json(deviceCode))
      .mockResolvedValueOnce(json({ error: 'slow_down' }, false))
      .mockResolvedValueOnce(json({ access_token: 'A', refresh_token: 'R', expires_in: 3600 }))
    const io = makeIO(fetchFn)
    await loginWithDeviceCode('cid', memoryStore(), io)
    expect(io.slept).toEqual([5000, 10000])
  })

  it('falla si el usuario rechaza el acceso', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(json(deviceCode))
      .mockResolvedValueOnce(json({ error: 'authorization_declined' }, false))
    await expect(loginWithDeviceCode('cid', memoryStore(), makeIO(fetchFn))).rejects.toThrow('authorization_declined')
  })

  it('falla si Microsoft no entrega el código de dispositivo', async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(json({ error: 'invalid_client' }, false))
    await expect(loginWithDeviceCode('cid', memoryStore(), makeIO(fetchFn))).rejects.toThrow('invalid_client')
  })
})
