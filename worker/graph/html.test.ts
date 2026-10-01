// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { htmlToText } from './html'

describe('htmlToText', () => {
  it('deja etiqueta y valor de una fila de tabla en la misma línea', () => {
    const html = '<table><tr><td style="x">Comercio:</td><td>DLC* DIDI FOODS</td></tr><tr><td>Monto:</td><td>CRC 3,730.00</td></tr></table>'
    expect(htmlToText(html).split('\n')).toEqual(['Comercio:\tDLC* DIDI FOODS', 'Monto:\tCRC 3,730.00'])
  })

  it('descarta head, style, script y comentarios', () => {
    const html = '<html><head><title>t</title><style>td{color:red}</style></head><body><!-- nota --><script>x()</script><p>Hola</p></body></html>'
    expect(htmlToText(html)).toBe('Hola')
  })

  it('convierte saltos de línea de bloque y <br>', () => {
    expect(htmlToText('<div>uno</div><p>dos<br>tres</p>')).toBe('uno\ndos\ntres')
  })

  it('decodifica entidades numéricas y con nombre', () => {
    expect(htmlToText('<p>Autorizaci&oacute;n&nbsp;A&amp;B &#8364; &#x41; &iexcl;Hola!</p>')).toBe('Autorización A&B € A ¡Hola!')
  })

  it('deja intactas las entidades desconocidas', () => {
    expect(htmlToText('<p>a &zzz; b</p>')).toBe('a &zzz; b')
  })

  it('colapsa espacios y quita líneas vacías', () => {
    expect(htmlToText('<p>  a   b  </p>\r\n\r\n<p></p><p>c</p>')).toBe('a b\nc')
  })

  it('no toca texto plano sin etiquetas', () => {
    expect(htmlToText('Comercio:    X\nMonto:    CRC 5.00')).toBe('Comercio: X\nMonto: CRC 5.00')
  })
})
