// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { loadConfig } from './config'

const env = { WORKER_USER_ID: 'u1', MS_CLIENT_ID: 'cid' }
const senders = JSON.stringify({ bac: ['alertas@bac.example'], promerica: [], davibank: [] })

describe('loadConfig', () => {
  it('aplica los valores por defecto', () => {
    expect(loadConfig(env, () => senders)).toMatchObject({
      userId: 'u1', msClientId: 'cid', ollamaUrl: 'http://localhost:11434', ollamaModel: 'qwen3:14b',
      pollMinutes: 5, requireAuthPass: false,
      senders: { bac: ['alertas@bac.example'], promerica: [], davibank: [] },
    })
  })

  it('lee las variables de entorno', () => {
    const cfg = loadConfig(
      { ...env, OLLAMA_URL: 'http://x:1', OLLAMA_MODEL: 'm', POLL_MINUTES: '10', REQUIRE_AUTH_PASS: 'true' },
      () => senders,
    )
    expect(cfg).toMatchObject({ ollamaUrl: 'http://x:1', ollamaModel: 'm', pollMinutes: 10, requireAuthPass: true })
  })

  it('lista todas las variables obligatorias que faltan', () => {
    expect(() => loadConfig({}, () => senders)).toThrow('WORKER_USER_ID, MS_CLIENT_ID')
  })

  it('rechaza un intervalo inválido', () => {
    expect(() => loadConfig({ ...env, POLL_MINUTES: '0' }, () => senders)).toThrow('POLL_MINUTES')
  })

  it('rechaza senders.json sin ninguna dirección', () => {
    expect(() => loadConfig(env, () => JSON.stringify({ bac: [], promerica: [], davibank: [] }))).toThrow('remitente')
  })

  it('rechaza senders.json con formato inválido', () => {
    expect(() => loadConfig(env, () => '{no json')).toThrow('senders.json')
    expect(() => loadConfig(env, () => JSON.stringify({ bac: 'alertas@bac.example' }))).toThrow('senders.json')
  })

  it('normaliza las direcciones a minúsculas', () => {
    const cfg = loadConfig(env, () => JSON.stringify({ bac: ['Alertas@BAC.example'] }))
    expect(cfg.senders.bac).toEqual(['alertas@bac.example'])
    expect(cfg.senders.promerica).toEqual([])
  })
})
