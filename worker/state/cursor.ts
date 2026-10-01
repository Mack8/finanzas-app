import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

export interface CursorStore {
  read(): Promise<string | null>
  write(receivedAt: string): Promise<void>
}

export function fileCursorStore(path: string): CursorStore {
  return {
    async read() {
      try {
        const parsed = JSON.parse(await readFile(path, 'utf8'))
        return typeof parsed?.receivedAt === 'string' ? parsed.receivedAt : null
      } catch {
        // Sin archivo o corrupto: se relee una ventana reciente; el registro evita duplicados.
        return null
      }
    },
    async write(receivedAt) {
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, JSON.stringify({ receivedAt }))
    },
  }
}

export function memoryCursorStore(initial: string | null = null): CursorStore & { value: string | null } {
  const store: CursorStore & { value: string | null } = {
    value: initial,
    async read() { return store.value },
    async write(receivedAt: string) { store.value = receivedAt },
  }
  return store
}
