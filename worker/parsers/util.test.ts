// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  labeled, missingFields, monthFromName, parseAmount, parseCurrency, parseMoney, to24h, toCostaRicaIso,
} from './util'

describe('parseAmount', () => {
  it('lee montos con miles y decimales', () => {
    expect(parseAmount('3,730.00')).toBe(3730)
    expect(parseAmount('1,250,000.50')).toBe(1250000.5)
    expect(parseAmount('3730')).toBe(3730)
    expect(parseAmount('12.5')).toBe(12.5)
  })

  it('rechaza formatos ambiguos o inválidos en vez de adivinar', () => {
    for (const bad of ['3.730,00', '1,23', '1,2345', '0', '0.00', '', 'abc', '-5', '3 730.00']) {
      expect(parseAmount(bad), bad).toBeNull()
    }
  })
})

describe('parseCurrency / parseMoney', () => {
  it('acepta solo CRC y USD', () => {
    expect(parseCurrency('crc')).toBe('CRC')
    expect(parseCurrency('USD')).toBe('USD')
    expect(parseCurrency('EUR')).toBeNull()
  })

  it('lee moneda y monto con o sin dos puntos', () => {
    expect(parseMoney('CRC 3,730.00')).toEqual({ currency: 'CRC', amount: 3730 })
    expect(parseMoney('CRC: 2,500.00')).toEqual({ currency: 'CRC', amount: 2500 })
    expect(parseMoney('USD 12.50')).toEqual({ currency: 'USD', amount: 12.5 })
    expect(parseMoney('EUR 5.00')).toBeNull()
    expect(parseMoney('3,730.00')).toBeNull()
  })
})

describe('monthFromName', () => {
  it('entiende abreviaturas en español e inglés', () => {
    expect(monthFromName('Sep')).toBe(9)
    expect(monthFromName('sep')).toBe(9)
    expect(monthFromName('set')).toBe(9)
    expect(monthFromName('Sept.')).toBe(9)
    expect(monthFromName('ene')).toBe(1)
    expect(monthFromName('Dec')).toBe(12)
    expect(monthFromName('dic')).toBe(12)
    expect(monthFromName('xyz')).toBeNull()
  })
})

describe('to24h', () => {
  it('convierte 12 h a 24 h sin confundir mediodía y medianoche', () => {
    expect(to24h(12, 'AM')).toBe(0)
    expect(to24h(12, 'PM')).toBe(12)
    expect(to24h(1, 'PM')).toBe(13)
    expect(to24h(11, 'AM')).toBe(11)
    expect(to24h(13, 'PM')).toBeNull()
    expect(to24h(0, 'AM')).toBeNull()
  })
})

describe('toCostaRicaIso', () => {
  it('escribe la hora local con offset -06:00 sin cambiar el día', () => {
    expect(toCostaRicaIso(2026, 9, 29, 19, 47)).toBe('2026-09-29T19:47:00-06:00')
    expect(toCostaRicaIso(2026, 9, 29, 23, 59)).toBe('2026-09-29T23:59:00-06:00')
    expect(toCostaRicaIso(2026, 1, 1, 0, 5)).toBe('2026-01-01T00:05:00-06:00')
  })

  it('rechaza fechas y horas imposibles', () => {
    expect(toCostaRicaIso(2026, 2, 30, 10, 0)).toBeNull()
    expect(toCostaRicaIso(2026, 13, 1, 10, 0)).toBeNull()
    expect(toCostaRicaIso(2026, 9, 29, 24, 0)).toBeNull()
    expect(toCostaRicaIso(2026, 9, 29, 10, 60)).toBeNull()
    expect(toCostaRicaIso(2028, 2, 29, 10, 0)).toBe('2028-02-29T10:00:00-06:00')
    expect(toCostaRicaIso(2027, 2, 29, 10, 0)).toBeNull()
  })
})

describe('labeled', () => {
  it('lee "Etiqueta: valor" y "Etiqueta   valor"', () => {
    expect(labeled('Comercio:    DLC* DIDI FOODS\nOtro: x', 'Comercio')).toBe('DLC* DIDI FOODS')
    expect(labeled('Comercio    TACO BELL\n', 'Comercio')).toBe('TACO BELL')
  })

  it('lee el valor cuando está en la línea siguiente', () => {
    expect(labeled('Monto    \nCRC: 2,500.00\n', 'Monto')).toBe('CRC: 2,500.00')
  })

  it('solo reconoce la etiqueta al inicio de línea', () => {
    expect(labeled('Tipo de Comercio    RESTAURANTS\nComercio    TACO BELL', 'Comercio')).toBe('TACO BELL')
  })

  it('devuelve null si la etiqueta no está', () => {
    expect(labeled('Nada por aquí', 'Comercio')).toBeNull()
  })
})

describe('missingFields', () => {
  it('lista los campos vacíos', () => {
    expect(missingFields({ a: 'x', b: null, c: '', d: 0 })).toEqual(['b', 'c', 'd'])
  })
})
