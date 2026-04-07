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

export const debtSchema = z.object({
  name: z.string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(80, 'El nombre no puede exceder 80 caracteres'),
  monthlyAmount: z.coerce.number()
    .finite('El monto debe ser válido')
    .positive('El monto debe ser mayor a 0'),
  currency: z.enum(['CRC', 'USD'], { error: 'Moneda inválida' }),
  totalInstallments: z.coerce.number()
    .int('El número de cuotas debe ser entero')
    .min(1, 'Debe tener al menos 1 cuota')
    .max(360, 'No puede exceder 360 cuotas'),
  startDate: z.string().min(1, 'La fecha de inicio es obligatoria'),
  notes: z.string().trim().max(500, 'Las notas no pueden exceder 500 caracteres').optional().or(z.literal('')),
})

export const savingsFundSchema = z.object({
  name: z.string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(80, 'El nombre no puede exceder 80 caracteres'),
  goalAmount: z.coerce.number()
    .finite('El monto debe ser válido')
    .positive('La meta debe ser mayor a 0'),
  goalCurrency: z.enum(['CRC', 'USD'], { error: 'Moneda inválida' }),
  targetDate: z.string().min(1, 'La fecha meta es obligatoria'),
  color: z.string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Seleccioná un color válido')
    .optional()
    .or(z.literal('')),
  monthlyContributionAmount: optionalPositiveAmount,
  monthlyContributionCurrency: z.enum(['CRC', 'USD'], { error: 'Moneda inválida' }).optional(),
})

export const contributionSchema = z.object({
  date: z.string().min(1, 'La fecha es obligatoria'),
  amount: z.coerce.number()
    .finite('El monto debe ser válido')
    .positive('El monto debe ser mayor a 0'),
  currency: z.enum(['CRC', 'USD'], { error: 'Moneda inválida' }),
  notes: z.string().trim().max(500, 'Las notas no pueden exceder 500 caracteres').optional().or(z.literal('')),
})

const optionalDay = z.preprocess(
  v => (v === '' || v === null || v === undefined ? undefined : v),
  z.coerce.number().int('Debe ser entero').min(1, 'Mínimo día 1').max(31, 'Máximo día 31').optional()
)

export const paymentAccountSchema = z.object({
  name: z.string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(60, 'El nombre no puede exceder 60 caracteres'),
  type: z.enum(['credit_card', 'bank_account'], { error: 'Tipo inválido' }),
  lastFour: z.string()
    .regex(/^\d{4}$/, 'Deben ser exactamente 4 dígitos')
    .optional()
    .or(z.literal('')),
  bankName: z.string()
    .trim()
    .max(60, 'El nombre del banco no puede exceder 60 caracteres')
    .optional()
    .or(z.literal('')),
  closingDay: optionalDay,
  paymentDueDay: optionalDay,
})

export type PaymentAccountFormValues = z.infer<typeof paymentAccountSchema>

export const incomeConfigSchema = z.object({
  firstPaymentAmount: z.coerce.number()
    .finite('El monto debe ser válido')
    .positive('El monto debe ser mayor a 0'),
  firstPaymentDay: z.coerce.number()
    .int('Debe ser entero')
    .min(1, 'Mínimo día 1')
    .max(31, 'Máximo día 31'),
  secondPaymentAmount: optionalPositiveAmount,
  secondPaymentDay: optionalDay,
  currency: z.enum(['CRC', 'USD'], { error: 'Moneda inválida' }),
  effectiveFrom: z.string().min(1, 'La fecha de vigencia es obligatoria'),
}).refine(data => {
  if (data.secondPaymentAmount !== undefined && !data.secondPaymentDay) return false
  return true
}, {
  path: ['secondPaymentDay'],
  message: 'Ingresá el día del segundo pago.',
})

export type IncomeConfigFormValues = z.infer<typeof incomeConfigSchema>

export type LoginFormValues = z.infer<typeof loginSchema>
export type RegisterFormValues = z.infer<typeof registerSchema>
export type TransactionFormValues = z.infer<typeof transactionSchema>
export type CategoryFormValues = z.infer<typeof categorySchema>
export type DebtFormValues = z.infer<typeof debtSchema>
export type SavingsFundFormValues = z.infer<typeof savingsFundSchema>
export type ContributionFormValues = z.infer<typeof contributionSchema>
