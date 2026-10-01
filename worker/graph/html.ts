const ENTITIES: Record<string, string> = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú',
  Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú',
  ntilde: 'ñ', Ntilde: 'Ñ', uuml: 'ü', iexcl: '¡', iquest: '¿',
  copy: '©', ordm: 'º', ordf: 'ª',
}

function decodeEntity(match: string, body: string): string {
  if (body[0] === '#') {
    const code = body[1].toLowerCase() === 'x' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10)
    return Number.isInteger(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match
  }
  return ENTITIES[body] ?? match
}

/**
 * Convierte el HTML de una alerta bancaria en texto con una línea por fila:
 * en una tabla, la celda de la etiqueta y la del valor quedan separadas por un tab.
 */
export function htmlToText(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(head|style|script)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>|<\/(?:p|div|tr|table|thead|tbody|h[1-6]|li|ul|ol)>/gi, '\n')
    .replace(/<\/(?:td|th)>/gi, '\t')
    .replace(/<[^>]*>/g, '')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, decodeEntity)
    .split(/\r?\n/)
    .map(line => line.replace(/[  \f\v]+/g, ' ').replace(/ ?\t ?/g, '\t').trim())
    .filter(line => line !== '')
    .join('\n')
}
