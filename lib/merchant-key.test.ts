import { describe, expect, it } from 'vitest'
import { merchantKey } from './merchant-key'

describe('merchantKey', () => {
  it('pone en mayúsculas y quita signos', () => {
    expect(merchantKey('DLC* DIDI FOODS')).toBe('DLC DIDI FOODS')
    expect(merchantKey('UBER *TRIP')).toBe('UBER TRIP')
  })

  it('quita tildes y colapsa espacios', () => {
    expect(merchantKey('  Café   Ñandú ')).toBe('CAFE NANDU')
  })

  it('quita tokens numéricos finales', () => {
    expect(merchantKey('ALM EL REY 8')).toBe('ALM EL REY')
    expect(merchantKey('SUPER 24 HORAS 123 45')).toBe('SUPER 24 HORAS')
  })

  it('no quita números que no son finales', () => {
    expect(merchantKey('ALM EL REY 8 ALAJUELA ALAJUELA')).toBe('ALM EL REY 8 ALAJUELA ALAJUELA')
  })

  it('conserva un único token numérico', () => {
    expect(merchantKey('123')).toBe('123')
  })

  it('devuelve vacío si no hay contenido', () => {
    expect(merchantKey('  *** ')).toBe('')
  })
})
