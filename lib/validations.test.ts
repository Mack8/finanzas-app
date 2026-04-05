import { describe, it, expect } from 'vitest'
import { categorySchema, loginSchema, registerSchema, transactionSchema } from './validations'

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: '123456' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: '123456' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('email')
  })

  it('rejects password shorter than 6 characters', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: '12345' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('password')
  })
})

describe('registerSchema', () => {
  it('accepts matching passwords', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    })
    expect(result.success).toBe(true)
  })

  it('rejects mismatched passwords', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
      confirmPassword: 'different',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('confirmPassword')
  })

  it('rejects password shorter than 8 characters', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'short',
      confirmPassword: 'short',
    })
    expect(result.success).toBe(false)
  })
})

describe('transactionSchema', () => {
  it('accepts a valid CRC transaction', () => {
    const result = transactionSchema.safeParse({
      date: '2026-04-04',
      description: 'Supermercado',
      amount: '12500',
      currency: 'CRC',
      categoryId: '550e8400-e29b-41d4-a716-446655440000',
      transactionType: 'personal',
      notes: 'Compra semanal',
    })

    expect(result.success).toBe(true)
  })

  it('rejects a transaction with missing category', () => {
    const result = transactionSchema.safeParse({
      date: '2026-04-04',
      description: 'Pago',
      amount: '1000',
      currency: 'CRC',
      categoryId: '',
      transactionType: 'personal',
      notes: '',
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('categoryId')
  })

  it('rejects a transaction with invalid amount', () => {
    const result = transactionSchema.safeParse({
      date: '2026-04-04',
      description: 'Pago',
      amount: '0',
      currency: 'USD',
      categoryId: '550e8400-e29b-41d4-a716-446655440000',
      transactionType: 'household',
      notes: '',
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('amount')
  })
})

describe('categorySchema', () => {
  it('accepts a valid custom category with monthly budget', () => {
    const result = categorySchema.safeParse({
      name: 'Mascotas',
      type: 'variable_expense',
      color: '#14b8a6',
      monthlyBudgetAmount: '45000',
      monthlyBudgetCurrency: 'CRC',
    })

    expect(result.success).toBe(true)
  })

  it('accepts a valid custom category without budget', () => {
    const result = categorySchema.safeParse({
      name: 'Freelance',
      type: 'income',
      color: '#22c55e',
      monthlyBudgetAmount: '',
      monthlyBudgetCurrency: undefined,
    })

    expect(result.success).toBe(true)
  })

  it('rejects invalid colors', () => {
    const result = categorySchema.safeParse({
      name: 'Mascotas',
      type: 'variable_expense',
      color: 'green',
      monthlyBudgetAmount: '',
      monthlyBudgetCurrency: undefined,
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('color')
  })
})
