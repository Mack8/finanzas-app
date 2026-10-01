import { describe, expect, it } from 'vitest'
import { ruleToLearn } from './merchant-rules'

const email = { source: 'email', description: 'DLC* DIDI FOODS', category_id: 'cat-a' }

describe('ruleToLearn', () => {
  it('aprende la regla cuando cambia la categoría de una transacción automática', () => {
    expect(ruleToLearn(email, 'cat-b')).toEqual({ merchant_key: 'DLC DIDI FOODS', category_id: 'cat-b' })
  })

  it('no aprende si la categoría no cambió', () => {
    expect(ruleToLearn(email, 'cat-a')).toBeNull()
  })

  it('no aprende de transacciones manuales', () => {
    expect(ruleToLearn({ ...email, source: null }, 'cat-b')).toBeNull()
  })

  it('no aprende si el comercio no tiene clave', () => {
    expect(ruleToLearn({ ...email, description: '***' }, 'cat-b')).toBeNull()
  })
})
