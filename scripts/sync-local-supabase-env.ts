import { execFileSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const managedHeader = '# Managed by npm run supabase:env'

function parseEnv(output: string): Map<string, string> {
  return new Map(
    output
      .split('\n')
      .flatMap(line => {
        const separator = line.indexOf('=')
        return separator > 0 ? [[line.slice(0, separator), line.slice(separator + 1)]] : []
      }),
  )
}

export function buildLocalSupabaseEnv(statusOutput: string): string {
  const values = parseEnv(statusOutput)
  const required = ['API_URL', 'ANON_KEY', 'SERVICE_ROLE_KEY'] as const
  const missing = required.filter(key => !values.get(key))
  if (missing.length > 0) {
    throw new Error(`Supabase local no reportó: ${missing.join(', ')}`)
  }

  return [
    managedHeader,
    `NEXT_PUBLIC_SUPABASE_URL=${values.get('API_URL')}`,
    `NEXT_PUBLIC_SUPABASE_ANON_KEY=${values.get('ANON_KEY')}`,
    `SUPABASE_SERVICE_ROLE_KEY=${values.get('SERVICE_ROLE_KEY')}`,
    '',
  ].join('\n')
}

export async function writeLocalSupabaseEnv({
  target,
  content,
  replace,
}: {
  target: string
  content: string
  replace: boolean
}): Promise<void> {
  let existing: string | null = null
  try {
    existing = await readFile(target, 'utf8')
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error
  }

  if (existing !== null && !existing.startsWith(managedHeader) && !replace) {
    throw new Error(
      `${target} existente no fue creado por este comando. Respaldalo como .env.remote.local o repetí con --replace.`,
    )
  }

  await writeFile(target, `${content.replace(/\n*$/, '')}\n`)
}

async function main() {
  const output = execFileSync('npx', ['supabase', 'status', '-o', 'env'], { encoding: 'utf8' })
  const target = join(process.cwd(), '.env.local')
  await writeLocalSupabaseEnv({
    target,
    content: buildLocalSupabaseEnv(output),
    replace: process.argv.includes('--replace'),
  })
  console.log('Variables de Supabase local sincronizadas en .env.local.')
}

if (process.argv[1]?.endsWith('sync-local-supabase-env.ts')) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
