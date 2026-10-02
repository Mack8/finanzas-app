import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildLocalSupabaseEnv, writeLocalSupabaseEnv } from './sync-local-supabase-env'

describe('buildLocalSupabaseEnv', () => {
  it('convierte las variables de la CLI a las que consume Next.js', () => {
    const env = buildLocalSupabaseEnv(
      'API_URL=http://127.0.0.1:54321\nANON_KEY=anon-local\nSERVICE_ROLE_KEY=service-local\n',
    )

    expect(env).toBe(
      '# Managed by npm run supabase:env\nNEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321\nNEXT_PUBLIC_SUPABASE_ANON_KEY=anon-local\nSUPABASE_SERVICE_ROLE_KEY=service-local\n',
    )
  })
})

describe('writeLocalSupabaseEnv', () => {
  it('rechaza reemplazar un archivo no administrado sin --replace', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'finanzas-env-'))
    const target = join(dir, '.env.local')
    await writeFile(target, 'NEXT_PUBLIC_SUPABASE_URL=https://remote.example\n')

    await expect(writeLocalSupabaseEnv({ target, content: 'local\n', replace: false }))
      .rejects.toThrow('existente')
  })

  it('sobrescribe un archivo administrado y conserva una nueva línea final', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'finanzas-env-'))
    const target = join(dir, '.env.local')
    await writeFile(target, '# Managed by npm run supabase:env\nantiguo=true\n')

    await writeLocalSupabaseEnv({ target, content: 'nuevo=true', replace: false })

    await expect(readFile(target, 'utf8')).resolves.toBe('nuevo=true\n')
  })
})
