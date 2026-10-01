import type { Ask } from './index'
import { FALLBACK_NAME } from './store'

export type OllamaConfig = { url: string; model: string; timeoutMs?: number }

function systemPrompt(categories: string[]): string {
  return (
    'Clasificas compras de tarjeta de un usuario en Costa Rica. ' +
    'Responde SOLO JSON {"category":"...","confidence":0-1}. ' +
    `category debe ser exactamente una de: ${[...categories, FALLBACK_NAME].join(', ')}. ` +
    `Si el comercio es ambiguo o irreconocible usa '${FALLBACK_NAME}'.`
  )
}

export function makeOllamaAsk(cfg: OllamaConfig, fetchFn: typeof fetch = fetch): Ask {
  return async ({ merchant, hint, categories }) => {
    const body = {
      model: cfg.model,
      stream: false,
      format: 'json',
      keep_alive: '30m',
      options: { temperature: 0 },
      ...(cfg.model.startsWith('qwen3') ? { think: false } : {}),
      messages: [
        { role: 'system', content: systemPrompt(categories) },
        { role: 'user', content: `Comercio: ${merchant}\nTipo: ${hint ?? 'n/d'}` },
      ],
    }

    let res: Response
    try {
      res = await fetchFn(`${cfg.url}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(cfg.timeoutMs ?? 60_000),
      })
    } catch {
      return null
    }
    if (!res.ok) return null

    try {
      const data = (await res.json()) as { message?: { content?: string } }
      const parsed = JSON.parse(data.message?.content ?? '')
      const { category, confidence } = parsed ?? {}
      if (typeof category !== 'string') return null
      if (typeof confidence !== 'number' || !(confidence >= 0 && confidence <= 1)) return null
      return { category, confidence }
    } catch {
      return null
    }
  }
}
