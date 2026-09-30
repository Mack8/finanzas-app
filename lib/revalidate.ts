import { revalidatePath } from 'next/cache'

/** Paths that depend on money mutations (ledger, plans, reports). */
export function revalidateMoneyPaths(...extra: string[]) {
  const paths = new Set(['/', '/transactions', '/savings', '/debts', '/reports', '/cards', ...extra])
  for (const path of paths) {
    revalidatePath(path)
  }
}
