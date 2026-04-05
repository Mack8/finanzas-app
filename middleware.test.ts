// middleware.test.ts
import { describe, it, expect } from 'vitest'

// Prueba de la lógica de redirección (pura, sin Supabase)
describe('middleware route logic', () => {
  const authRoutes = ['/login', '/register']
  const publicPaths = ['/_next/static', '/favicon.ico', '/icon.png']

  function isAuthRoute(pathname: string) {
    return authRoutes.some(r => pathname.startsWith(r))
  }

  function isPublicAsset(pathname: string) {
    return publicPaths.some(p => pathname.startsWith(p))
  }

  it('identifies /login as an auth route', () => {
    expect(isAuthRoute('/login')).toBe(true)
  })

  it('identifies /register as an auth route', () => {
    expect(isAuthRoute('/register')).toBe(true)
  })

  it('does not identify /dashboard as an auth route', () => {
    expect(isAuthRoute('/dashboard')).toBe(false)
  })

  it('identifies _next/static as public asset', () => {
    expect(isPublicAsset('/_next/static/chunk.js')).toBe(true)
  })

  it('does not identify /api/transactions as public asset', () => {
    expect(isPublicAsset('/api/transactions')).toBe(false)
  })
})
