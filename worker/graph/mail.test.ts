// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { buildMessagesUrl, fetchBankMessages, type SenderMap } from './mail'

const senders: SenderMap = {
  bac: ['alertas@bac.example'],
  promerica: ['notificaciones@promerica.example'],
  davibank: ['avisos@davibank.example', 'otro@davibank.example'],
}

function page(value: unknown[], nextLink?: string) {
  return { ok: true, status: 200, json: async () => ({ value, '@odata.nextLink': nextLink }) } as Response
}

const graphMessage = (over: Record<string, unknown> = {}) => ({
  id: 'm1',
  subject: 'Notificación de transacción',
  receivedDateTime: '2026-09-29T19:48:10Z',
  from: { emailAddress: { address: 'Alertas@BAC.example' } },
  body: { contentType: 'text', content: 'Comercio:    X' },
  internetMessageHeaders: [{ name: 'Authentication-Results', value: 'spf=pass; dkim=pass; dmarc=pass action=none' }],
  ...over,
})

describe('buildMessagesUrl', () => {
  it('filtra por fecha y por todos los remitentes permitidos', () => {
    const url = decodeURIComponent(buildMessagesUrl('2026-09-29T00:00:00Z', senders))
    expect(url).toContain('https://graph.microsoft.com/v1.0/me/messages?')
    expect(url).toContain('receivedDateTime ge 2026-09-29T00:00:00Z')
    expect(url).toContain("from/emailAddress/address eq 'alertas@bac.example'")
    expect(url).toContain("from/emailAddress/address eq 'otro@davibank.example'")
    expect(url).toContain('$orderby=receivedDateTime asc')
  })

  it('escapa comillas simples en las direcciones', () => {
    const url = decodeURIComponent(buildMessagesUrl('2026-09-29T00:00:00Z', { ...senders, bac: ["o'brien@bac.example"] }))
    expect(url).toContain("o''brien@bac.example")
  })

  it('falla si no hay remitentes configurados', () => {
    expect(() => buildMessagesUrl('2026-09-29T00:00:00Z', { bac: [], promerica: [], davibank: [] })).toThrow(/remitentes/)
  })
})

describe('fetchBankMessages', () => {
  it('pide el cuerpo en texto plano y envía el token', async () => {
    const fetchFn = vi.fn().mockResolvedValue(page([]))
    await fetchBankMessages('TOKEN', '2026-09-29T00:00:00Z', senders, fetchFn)
    expect(fetchFn.mock.calls[0][1].headers).toEqual({
      Authorization: 'Bearer TOKEN',
      Prefer: 'outcome.body-content-type="text"',
    })
  })

  it('asigna el banco por remitente sin distinguir mayúsculas y mapea los campos', async () => {
    const fetchFn = vi.fn().mockResolvedValue(page([graphMessage()]))
    expect(await fetchBankMessages('T', 'x', senders, fetchFn)).toEqual([{
      id: 'm1', bank: 'bac', receivedAt: '2026-09-29T19:48:10Z', from: 'alertas@bac.example',
      subject: 'Notificación de transacción', bodyText: 'Comercio:    X', authPass: true,
    }])
  })

  it('sigue la paginación', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(page([graphMessage({ id: 'm1' })], 'https://graph.microsoft.com/next'))
      .mockResolvedValueOnce(page([graphMessage({ id: 'm2' })]))
    const out = await fetchBankMessages('T', 'x', senders, fetchFn)
    expect(out.map(m => m.id)).toEqual(['m1', 'm2'])
    expect(fetchFn.mock.calls[1][0]).toBe('https://graph.microsoft.com/next')
  })

  it('descarta mensajes de remitentes fuera de la lista', async () => {
    const stranger = graphMessage({ id: 'm9', from: { emailAddress: { address: 'phisher@evil.example' } } })
    const fetchFn = vi.fn().mockResolvedValue(page([stranger, graphMessage()]))
    expect((await fetchBankMessages('T', 'x', senders, fetchFn)).map(m => m.id)).toEqual(['m1'])
  })

  it('marca authPass=false si DMARC no pasó y null si no hay encabezado', async () => {
    const failed = graphMessage({ id: 'a', internetMessageHeaders: [{ name: 'authentication-results', value: 'dmarc=fail' }] })
    const none = graphMessage({ id: 'b', internetMessageHeaders: [] })
    const fetchFn = vi.fn().mockResolvedValue(page([failed, none]))
    const out = await fetchBankMessages('T', 'x', senders, fetchFn)
    expect(out.map(m => m.authPass)).toEqual([false, null])
  })

  it('lanza un error si Graph responde con falla', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 503 } as Response)
    await expect(fetchBankMessages('T', 'x', senders, fetchFn)).rejects.toThrow('503')
  })
})
