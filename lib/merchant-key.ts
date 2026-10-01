/** Normaliza el nombre de un comercio para usarlo como clave de regla. */
export function merchantKey(raw: string): string {
  const cleaned = raw
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (cleaned === '') return ''

  const tokens = cleaned.split(' ')
  while (tokens.length > 1 && /^\d+$/.test(tokens[tokens.length - 1])) {
    tokens.pop()
  }
  return tokens.join(' ')
}
