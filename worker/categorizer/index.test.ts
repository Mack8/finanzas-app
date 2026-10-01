// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { categorize } from './index'
import type { CategoryStore } from './store'

const categories = [
  { id: 'c-food', name: 'Alimentación' },
  { id: 'c-transport', name: 'Transporte' },
]

function makeStore(rules: Record<string, string> = {}): CategoryStore {
  return {
    listExpenseCategories: async () => categories,
    findRule: async key => rules[key] ?? null,
    fallbackCategoryId: async () => 'c-fallback',
  }
}

describe('categorize', () => {
  it('la regla aprendida gana y no consulta al modelo', async () => {
    const ask = vi.fn()
    const r = await categorize('DLC* DIDI FOODS', null, { store: makeStore({ 'DLC DIDI FOODS': 'c-food' }), ask })
    expect(r).toEqual({ categoryId: 'c-food', source: 'rule' })
    expect(ask).not.toHaveBeenCalled()
  })

  it('usa el modelo cuando no hay regla y la confianza alcanza', async () => {
    const ask = vi.fn().mockResolvedValue({ category: 'Transporte', confidence: 0.9 })
    const r = await categorize('UBER *TRIP', null, { store: makeStore(), ask })
    expect(r).toEqual({ categoryId: 'c-transport', source: 'model', categoryName: 'Transporte' })
    expect(ask).toHaveBeenCalledWith({ merchant: 'UBER *TRIP', hint: null, categories: ['Alimentación', 'Transporte'] })
  })

  it('compara el nombre sin distinguir mayúsculas ni espacios extra', async () => {
    const ask = vi.fn().mockResolvedValue({ category: '  alimentación ', confidence: 1 })
    expect((await categorize('X', null, { store: makeStore(), ask })).categoryId).toBe('c-food')
  })

  it('cae al respaldo con confianza baja', async () => {
    const ask = vi.fn().mockResolvedValue({ category: 'Transporte', confidence: 0.59 })
    expect(await categorize('X', null, { store: makeStore(), ask })).toEqual({ categoryId: 'c-fallback', source: 'fallback' })
  })

  it('acepta exactamente el umbral', async () => {
    const ask = vi.fn().mockResolvedValue({ category: 'Transporte', confidence: 0.6 })
    expect((await categorize('X', null, { store: makeStore(), ask })).source).toBe('model')
  })

  it('cae al respaldo si el modelo inventa una categoría', async () => {
    const ask = vi.fn().mockResolvedValue({ category: 'Criptomonedas', confidence: 1 })
    expect((await categorize('X', null, { store: makeStore(), ask })).source).toBe('fallback')
  })

  it('cae al respaldo si el modelo responde "Sin categorizar"', async () => {
    const ask = vi.fn().mockResolvedValue({ category: 'Sin categorizar', confidence: 1 })
    expect((await categorize('X', null, { store: makeStore(), ask })).source).toBe('fallback')
  })

  it('cae al respaldo si el modelo no responde (Ollama apagado o basura)', async () => {
    const ask = vi.fn().mockResolvedValue(null)
    expect((await categorize('X', null, { store: makeStore(), ask })).source).toBe('fallback')
  })

  it('cae al respaldo si ask lanza una excepción', async () => {
    const ask = vi.fn().mockRejectedValue(new Error('boom'))
    expect((await categorize('X', null, { store: makeStore(), ask })).source).toBe('fallback')
  })

  it('cae al respaldo si el usuario no tiene categorías de gasto', async () => {
    const store = { ...makeStore(), listExpenseCategories: async () => [] }
    const ask = vi.fn()
    expect((await categorize('X', null, { store, ask })).source).toBe('fallback')
    expect(ask).not.toHaveBeenCalled()
  })

  it('respeta un umbral distinto', async () => {
    const ask = vi.fn().mockResolvedValue({ category: 'Transporte', confidence: 0.3 })
    expect((await categorize('X', null, { store: makeStore(), ask, minConfidence: 0.2 })).source).toBe('model')
  })
})
