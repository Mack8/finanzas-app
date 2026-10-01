import type { CurrencyCode } from '@/types/database'

const AMOUNT_RE = /^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?$/

/** Monto con coma de miles y punto decimal. Devuelve null ante cualquier otro formato. */
export function parseAmount(raw: string): number | null {
  const s = raw.trim()
  if (!AMOUNT_RE.test(s)) return null
  const n = Number(s.replace(/,/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

export function parseCurrency(raw: string): CurrencyCode | null {
  const c = raw.toUpperCase()
  return c === 'CRC' || c === 'USD' ? c : null
}

/** "CRC 3,730.00" o "CRC: 2,500.00". */
export function parseMoney(raw: string): { currency: CurrencyCode; amount: number } | null {
  const m = raw.trim().match(/^([A-Za-z]{3})\s*:?\s*(\S+)$/)
  if (!m) return null
  const currency = parseCurrency(m[1])
  const amount = parseAmount(m[2])
  return currency && amount !== null ? { currency, amount } : null
}

const MONTHS: Record<string, number> = {
  ene: 1, jan: 1, feb: 2, mar: 3, abr: 4, apr: 4, may: 5, jun: 6,
  jul: 7, ago: 8, aug: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12, dec: 12,
}

export function monthFromName(name: string): number | null {
  return MONTHS[name.toLowerCase().replace(/\.$/, '').slice(0, 3)] ?? null
}

/** Hora de reloj de 12 h → 24 h. 12 AM = 0, 12 PM = 12. */
export function to24h(hour12: number, meridiem: string): number | null {
  if (hour12 < 1 || hour12 > 12) return null
  const pm = meridiem.toUpperCase().startsWith('P')
  return (hour12 % 12) + (pm ? 12 : 0)
}

/** Costa Rica es UTC−6 todo el año: se escribe la hora local con su offset, sin convertir. */
export function toCostaRicaIso(y: number, mo: number, d: number, h: number, mi: number): string | null {
  if (mo < 1 || mo > 12 || d < 1 || h < 0 || h > 23 || mi < 0 || mi > 59) return null
  const daysInMonth = new Date(Date.UTC(y, mo, 0)).getUTCDate()
  if (d > daysInMonth) return null
  const p = (n: number) => String(n).padStart(2, '0')
  return `${y}-${p(mo)}-${p(d)}T${p(h)}:${p(mi)}:00-06:00`
}

/**
 * Valor de una línea "Etiqueta<separador>valor". El separador puede ser ':' y/o
 * espacios, tabs o un salto de línea. La etiqueta debe estar al inicio de línea.
 * `label` es el código fuente de una expresión regular.
 */
export function labeled(text: string, label: string): string | null {
  const re = new RegExp(`^[ \\t]*${label}[ \\t]*:?\\s+(\\S[^\\r\\n]*)`, 'mi')
  return text.match(re)?.[1]?.trim() ?? null
}

export function missingFields(fields: Record<string, unknown>): string[] {
  return Object.entries(fields)
    .filter(([, value]) => !value)
    .map(([name]) => name)
}

export function fail(reason: string): { ok: false; reason: string } {
  return { ok: false, reason }
}
