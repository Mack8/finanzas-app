// @vitest-environment node
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { fileCursorStore, memoryCursorStore } from './cursor'

let dir: string
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'cursor-')) })
afterEach(() => rmSync(dir, { recursive: true, force: true }))

describe('fileCursorStore', () => {
  it('devuelve null si el archivo no existe', async () => {
    expect(await fileCursorStore(join(dir, 'x', 'cursor.json')).read()).toBeNull()
  })

  it('guarda y lee el cursor, creando la carpeta', async () => {
    const store = fileCursorStore(join(dir, 'x', 'cursor.json'))
    await store.write('2026-09-29T20:00:00Z')
    expect(await store.read()).toBe('2026-09-29T20:00:00Z')
  })

  it('devuelve null si el archivo está corrupto', async () => {
    const path = join(dir, 'cursor.json')
    writeFileSync(path, '{no es json')
    expect(await fileCursorStore(path).read()).toBeNull()
  })
})

describe('memoryCursorStore', () => {
  it('guarda en memoria', async () => {
    const store = memoryCursorStore()
    expect(await store.read()).toBeNull()
    await store.write('2026-09-29T20:00:00Z')
    expect(store.value).toBe('2026-09-29T20:00:00Z')
  })
})
