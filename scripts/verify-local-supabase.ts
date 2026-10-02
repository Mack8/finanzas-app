import { createClient } from '@supabase/supabase-js'

try { process.loadEnvFile('.env.local') } catch { /* variables del proceso */ }

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !anonKey || !serviceRoleKey) throw new Error('Faltan las variables de Supabase local. Ejecutá npm run supabase:env.')

async function main(localUrl: string, localAnonKey: string, localServiceRoleKey: string) {
  const supabase = createClient(localUrl, localAnonKey)
  const admin = createClient(localUrl, localServiceRoleKey)
  const { data: foreignControl, error: foreignControlError } = await admin
    .from('transactions')
    .select('id')
    .eq('id', '66666666-6666-6666-6666-666666666666')
    .maybeSingle()

  if (foreignControlError || !foreignControl) throw new Error('Falta la transacción sintética usada para comprobar RLS.')

  const { data: signIn, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'dev@finanzas.local',
    password: 'finanzas-local-dev',
  })

  if (signInError || !signIn.user) throw new Error(`No se pudo autenticar el usuario local: ${signInError?.message ?? 'sin usuario'}`)

  const [{ data: categories, error: categoriesError }, { data: transactions, error: transactionsError }] = await Promise.all([
    supabase.from('categories').select('id').eq('user_id', signIn.user.id),
    supabase.from('transactions').select('id').eq('user_id', signIn.user.id),
  ])

  if (categoriesError || !categories?.length) throw new Error('El usuario local no puede leer sus categorías.')
  if (transactionsError || !transactions?.length) throw new Error('El usuario local no puede leer sus transacciones.')

  const { data: foreignRows, error: foreignError } = await supabase
    .from('transactions')
    .select('id')
    .neq('user_id', signIn.user.id)

  if (foreignError || foreignRows?.length) throw new Error('RLS expuso transacciones de otro usuario.')

  console.log('Supabase local: Auth y RLS verificados.')
}

main(url, anonKey, serviceRoleKey).catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
