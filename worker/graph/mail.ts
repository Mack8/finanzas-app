import { BANKS, type Bank, type MailMessage } from '../types'

export type SenderMap = Record<Bank, string[]>
export type BankMessage = MailMessage & { bank: Bank }

type GraphMessage = {
  id: string
  subject?: string
  receivedDateTime: string
  from?: { emailAddress?: { address?: string } }
  body?: { content?: string }
  internetMessageHeaders?: { name: string; value: string }[]
}

type GraphPage = { value: GraphMessage[]; '@odata.nextLink'?: string }

export function buildMessagesUrl(since: string, senders: SenderMap): string {
  const addresses = BANKS.flatMap(bank => senders[bank] ?? [])
  if (addresses.length === 0) throw new Error('No hay remitentes configurados en worker/senders.json.')

  const fromFilter = addresses
    .map(a => `from/emailAddress/address eq '${a.replace(/'/g, "''")}'`)
    .join(' or ')

  const params: Record<string, string> = {
    $filter: `receivedDateTime ge ${since} and (${fromFilter})`,
    $orderby: 'receivedDateTime asc',
    $top: '50',
    $select: 'id,subject,receivedDateTime,from,body,internetMessageHeaders',
  }
  const qs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')
  return `https://graph.microsoft.com/v1.0/me/messages?${qs}`
}

function bankForSender(address: string, senders: SenderMap): Bank | null {
  return BANKS.find(bank => (senders[bank] ?? []).some(a => a.toLowerCase() === address)) ?? null
}

function authPassOf(headers: GraphMessage['internetMessageHeaders']): boolean | null {
  const results = (headers ?? []).filter(h => h.name.toLowerCase() === 'authentication-results')
  if (results.length === 0) return null
  return results.some(h => /dmarc=pass/i.test(h.value))
}

export async function fetchBankMessages(
  token: string,
  since: string,
  senders: SenderMap,
  fetchFn: typeof fetch = fetch,
): Promise<BankMessage[]> {
  const out: BankMessage[] = []
  let url: string | null = buildMessagesUrl(since, senders)

  while (url) {
    const res = await fetchFn(url, {
      headers: { Authorization: `Bearer ${token}`, Prefer: 'outcome.body-content-type="text"' },
    })
    if (!res.ok) throw new Error(`Microsoft Graph respondió ${res.status}`)

    const page = (await res.json()) as GraphPage
    for (const m of page.value) {
      const from = m.from?.emailAddress?.address?.toLowerCase()
      const bank = from ? bankForSender(from, senders) : null
      if (!from || !bank) continue
      out.push({
        id: m.id,
        bank,
        receivedAt: m.receivedDateTime,
        from,
        subject: m.subject ?? '',
        bodyText: m.body?.content ?? '',
        authPass: authPassOf(m.internetMessageHeaders),
      })
    }
    url = page['@odata.nextLink'] ?? null
  }
  return out
}
