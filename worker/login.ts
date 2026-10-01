import { join } from 'node:path'
import { stateDir } from './config'
import { defaultIO, fileTokenStore, loginWithDeviceCode } from './graph/auth'

try { process.loadEnvFile('.env.local') } catch { /* sin .env.local: se usan las variables del entorno */ }

async function main() {
  const clientId = process.env.MS_CLIENT_ID
  if (!clientId) throw new Error('Falta MS_CLIENT_ID en .env.local (ver worker/README.md).')

  await loginWithDeviceCode(clientId, fileTokenStore(join(stateDir(), 'token.json')), defaultIO)
  console.log('Sesión de Microsoft guardada en worker/.state/token.json')
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
