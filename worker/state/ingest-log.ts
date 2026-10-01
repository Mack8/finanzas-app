import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { Bank } from '../types'

export type IngestStatus = 'created' | 'duplicate' | 'unparsed' | 'error'

export type IngestEntry = {
  messageId: string
  bank: Bank | null
  status: IngestStatus
  subject?: string | null
  detail?: string | null
  transactionId?: string | null
}

export interface IngestLog {
  /** true si el correo ya se resolvió (creado, duplicado o no reconocido). Los `error` se reintentan. */
  isDone(messageId: string): Promise<boolean>
  record(entry: IngestEntry): Promise<void>
}

export function supabaseIngestLog(supabase: SupabaseClient<Database>, userId: string): IngestLog {
  return {
    async isDone(messageId) {
      const { data, error } = await supabase
        .from('email_ingest_log')
        .select('status')
        .eq('user_id', userId)
        .eq('message_id', messageId)
        .in('status', ['created', 'duplicate', 'unparsed'])
        .maybeSingle()
      if (error) throw new Error(`No se pudo consultar el registro de ingesta: ${error.message}`)
      return data !== null
    },

    async record(entry) {
      const { error } = await supabase.from('email_ingest_log').upsert(
        {
          user_id: userId,
          message_id: entry.messageId,
          bank: entry.bank,
          status: entry.status,
          subject: entry.subject ?? null,
          detail: entry.detail ?? null,
          transaction_id: entry.transactionId ?? null,
        },
        { onConflict: 'user_id,message_id' },
      )
      if (error) throw new Error(`No se pudo escribir el registro de ingesta: ${error.message}`)
    },
  }
}

export function memoryIngestLog(): IngestLog & { entries: IngestEntry[] } {
  const log: IngestLog & { entries: IngestEntry[] } = {
    entries: [],
    async isDone(messageId) {
      return log.entries.some(e => e.messageId === messageId && e.status !== 'error')
    },
    async record(entry) {
      log.entries = log.entries.filter(e => e.messageId !== entry.messageId)
      log.entries.push(entry)
    },
  }
  return log
}
