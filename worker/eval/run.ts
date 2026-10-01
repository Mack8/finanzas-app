import cases from './cases.json'
import { makeOllamaAsk } from '../categorizer/ollama'
import { FALLBACK_NAME } from '../categorizer/store'

try { process.loadEnvFile('.env.local') } catch { /* sin .env.local: se usan las variables del entorno */ }

const MIN_CONFIDENCE = 0.6
const categories = ['Servicios', 'Suscripciones', 'Alimentación', 'Compras', 'Ocio', 'Social', 'Transporte', 'Salud', 'Cuotas']
const model = process.argv[2] ?? process.env.OLLAMA_MODEL ?? 'qwen3:14b'
const ask = makeOllamaAsk({ url: process.env.OLLAMA_URL ?? 'http://localhost:11434', model })

async function main() {
  let hits = 0
  for (const c of cases) {
    const t = Date.now()
    const answer = await ask({ merchant: c.merchant, hint: c.hint, categories })
    const usable = answer && answer.confidence >= MIN_CONFIDENCE && categories.includes(answer.category)
    const got = usable ? answer.category : FALLBACK_NAME
    const ok = got === c.expected
    if (ok) hits++
    console.log(`${ok ? 'OK  ' : 'FALLA'} ${String(Date.now() - t).padStart(5)} ms  ${c.merchant}  →  ${got}${ok ? '' : `  (esperado: ${c.expected})`}`)
  }
  console.log(`\n${model}: ${hits}/${cases.length} correctos`)
}

main()
