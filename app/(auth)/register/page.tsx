'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Wallet, ShieldCheck, LineChart, PiggyBank } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { registerSchema, type RegisterFormValues } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function RegisterPage() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  })

  async function onSubmit(values: RegisterFormValues) {
    setServerError(null)
    setSuccessMessage(null)
    const supabase = createClient()

    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    })

    if (error) {
      setServerError(error.message)
      return
    }

    setSuccessMessage(
      'Cuenta creada. Revisá tu email para confirmar tu cuenta antes de iniciar sesión.'
    )
  }

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden flex-1 overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 px-12 text-white lg:flex lg:flex-col lg:items-center lg:justify-center">
        <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 size-72 rounded-full bg-cyan-300/20 blur-3xl" />

        <div className="relative z-10 max-w-md">
          <div className="mb-8 flex size-16 items-center justify-center rounded-2xl border border-white/20 bg-white/15 shadow-lg backdrop-blur-sm">
            <Wallet className="size-8 text-white" />
          </div>
          <h2 className="mb-3 text-3xl font-bold tracking-tight">
            Empezá a controlar tus finanzas
          </h2>
          <p className="mb-8 text-base leading-relaxed text-white/85">
            Creá tu cuenta gratis y llevá el control de tus ingresos, gastos y ahorros.
          </p>
          <ul className="space-y-3 text-sm text-white/90">
            <li className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 backdrop-blur-sm">
              <LineChart className="size-4 shrink-0" /> Dashboard con KPIs y tendencias
            </li>
            <li className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 backdrop-blur-sm">
              <PiggyBank className="size-4 shrink-0" /> Metas de ahorro y aportes
            </li>
            <li className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 backdrop-blur-sm">
              <ShieldCheck className="size-4 shrink-0" /> Dual currency CRC / USD
            </li>
          </ul>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-12 lg:px-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary shadow-sm">
              <Wallet className="size-5 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <span className="block text-lg font-semibold text-foreground">Finanzas</span>
              <span className="block text-xs text-muted-foreground">Control personal</span>
            </div>
          </div>

          <h1 className="mb-1 text-2xl font-bold tracking-tight text-foreground">Crear cuenta</h1>
          <p className="mb-8 text-sm text-muted-foreground">
            Ingresá tus datos para registrarte
          </p>

          {successMessage ? (
            <div className="space-y-4">
              <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success" role="status">
                {successMessage}
              </p>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                size="lg"
                onClick={() => router.push('/login')}
              >
                Ir a iniciar sesión
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="vos@ejemplo.com"
                  autoComplete="email"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-xs text-danger" role="alert">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-xs text-danger" role="alert">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  {...register('confirmPassword')}
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-danger" role="alert">{errors.confirmPassword.message}</p>
                )}
              </div>

              {serverError && (
                <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
                  {serverError}
                </p>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            ¿Ya tenés cuenta?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Iniciá sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
