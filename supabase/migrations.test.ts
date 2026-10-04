import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const integrityMigration = readFileSync('supabase/migrations/008_scheduled_payment_integrity.sql', 'utf8')

describe('scheduled payment database integrity migration', () => {
  it('rejects scheduled transaction references to another user’s debt or obligation', () => {
    expect(integrityMigration).toContain('d.id = new.debt_id and d.user_id = new.user_id')
    expect(integrityMigration).toContain('r.id = new.recurring_obligation_id and r.user_id = new.user_id')
  })

  it('protects recurring obligation category and account ownership', () => {
    expect(integrityMigration).toContain('c.id = new.category_id and c.user_id = new.user_id')
    expect(integrityMigration).toContain('a.id = new.payment_account_id and a.user_id = new.user_id')
  })

  it('prevents deletion or reassignment of a scheduled ledger occurrence', () => {
    expect(integrityMigration).toContain("if old.scheduled_due_date is not null then")
    expect(integrityMigration).toContain('new.scheduled_due_date is distinct from old.scheduled_due_date')
    expect(integrityMigration).toContain('before insert or update or delete on public.transactions')
  })
})
