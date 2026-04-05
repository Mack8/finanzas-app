import { z } from 'zod'

const optionalPositiveAmount = z.preprocess(value => {
  if (value === '' || value === null || value === undefined) {
    return undefined
  }

  return value
}, z.coerce.number()
  .finite('El monto debe ser válido')
  .positive('El monto debe ser mayor a 0')
  .optional())

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

export const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
})

export const transactionSchema = z.object({
  date: z.string().min(1, 'La fecha es obligatoria'),
  description: z.string()
    .trim()
    .min(3, 'La descripción debe tener al menos 3 caracteres')
    .max(120, 'La descripción no puede exceder 120 caracteres'),
  amount: z.coerce.number()
    .finite('El monto debe ser válido')
    .positive('El monto debe ser mayor a 0'),
  currency: z.enum(['CRC', 'USD'], {
    error: 'Moneda inválida',
  }),
  categoryId: z.string().uuid('Seleccioná una categoría válida'),
  transactionType: z.enum(['personal', 'household', 'reimbursement'], {
    error: 'Tipo de transacción inválido',
  }),
  notes: z.string()
    .trim()
    .max(500, 'Las notas no pueden exceder 500 caracteres')
    .optional()
    .or(z.literal('')),
})

export const categorySchema = z.object({
  name: z.string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'El nombre no puede exceder 50 caracteres'),
  type: z.enum(['fixed_expense', 'variable_expense', 'savings', 'income'], {
    error: 'Tipo de categoría inválido',
  }),
  color: z.string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Seleccioná un color válido'),
  monthlyBudgetAmount: optionalPositiveAmount,
  monthlyBudgetCurrency: z.enum(['CRC', 'USD'], {
    error: 'Moneda inválida',
  }).optional(),
}).refine(data => {
  if (data.monthlyBudgetAmount === undefined) {
    return true
  }

  return Boolean(data.monthlyBudgetCurrency)
}, {
  path: ['monthlyBudgetCurrency'],
  message: 'Seleccioná la moneda del presupuesto.',
})

export type LoginFormValues = z.infer<typeof loginSchema>
export type RegisterFormValues = z.infer<typeof registerSchema>
export type TransactionFormValues = z.infer<typeof transactionSchema>
export type CategoryFormValues = z.infer<typeof categorySchema>
