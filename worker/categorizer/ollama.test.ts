// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { makeOllamaAsk } from './ollama'

const cfg = { url: 'http://ollama.test', model: 'qwen3:14b' }
const input = { merchant: 'UBER *TRIP', hint: null, categories: ['Alimentación', 'Transporte'] }

function reply(content: string, ok = true) {
  return vi.fn().mockResolvedValue({ ok, json: async () => ({ message: { content } }) })
}

describe('makeOllamaAsk', () => {
  it('devuelve categoría y confianza de una respuesta válida', async () => {
    const ask = makeOllamaAsk(cfg, reply('{"category":"Transporte","confidence":0.92}'))
    expect(await ask(input)).toEqual({ category: 'Transporte', confidence: 0.92 })
  })

  it('envía el prompt con las categorías, el respaldo y el modo sin razonamiento', async () => {
    const fetchFn = reply('{"category":"Transporte","confidence":1}')
    await makeOllamaAsk(cfg, fetchFn)(input)
    const [url, init] = fetchFn.mock.calls[0]
    const body = JSON.parse(init.body)
    expect(url).toBe('http://ollama.test/api/chat')
    expect(body).toMatchObject({ model: 'qwen3:14b', stream: false, format: 'json', think: false, options: { temperature: 0 } })
    expect(body.messages[0].content).toContain('Alimentación, Transporte, Sin categorizar')
    expect(body.messages[1].content).toContain('Comercio: UBER *TRIP')
  })

  it('no manda "think" a modelos que no lo soportan', async () => {
    const fetchFn = reply('{"category":"Transporte","confidence":1}')
    await makeOllamaAsk({ ...cfg, model: 'llama3.1:8b' }, fetchFn)(input)
    expect(JSON.parse(fetchFn.mock.calls[0][1].body)).not.toHaveProperty('think')
  })

  it('incluye el rubro del banco cuando existe', async () => {
    const fetchFn = reply('{"category":"Alimentación","confidence":1}')
    await makeOllamaAsk(cfg, fetchFn)({ ...input, hint: 'RESTAURANTS' })
    expect(JSON.parse(fetchFn.mock.calls[0][1].body).messages[1].content).toContain('Tipo: RESTAURANTS')
  })

  it.each([
    ['JSON inválido', 'Claro, la categoría es Transporte'],
    ['sin categoría', '{"confidence":0.9}'],
    ['confianza como texto', '{"category":"Transporte","confidence":"alta"}'],
    ['confianza fuera de rango', '{"category":"Transporte","confidence":7}'],
    ['contenido vacío', ''],
  ])('devuelve null ante %s', async (_name, content) => {
    expect(await makeOllamaAsk(cfg, reply(content))(input)).toBeNull()
  })

  it('devuelve null si Ollama responde con error HTTP', async () => {
    expect(await makeOllamaAsk(cfg, reply('{}', false))(input)).toBeNull()
  })

  it('devuelve null si Ollama está apagado', async () => {
    const down = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))
    expect(await makeOllamaAsk(cfg, down)(input)).toBeNull()
  })
})
