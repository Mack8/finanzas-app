// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parsePurchase } from './index'

const read = (name: string) => readFileSync(join(__dirname, '__fixtures__', name), 'utf8')

describe('parsePurchase', () => {
  it('elige el parser según el banco', () => {
    expect(parsePurchase('bac', read('bac-compra.txt'))).toMatchObject({ ok: true, purchase: { bank: 'bac' } })
    expect(parsePurchase('promerica', read('promerica-compra.txt'))).toMatchObject({ ok: true, purchase: { bank: 'promerica' } })
    expect(parsePurchase('davibank', read('davibank-compra.txt'))).toMatchObject({ ok: true, purchase: { bank: 'davibank' } })
  })

  it('no interpreta el correo de un banco con el parser de otro', () => {
    expect(parsePurchase('bac', read('promerica-compra.txt')).ok).toBe(false)
    expect(parsePurchase('davibank', read('bac-compra.txt')).ok).toBe(false)
  })
})
