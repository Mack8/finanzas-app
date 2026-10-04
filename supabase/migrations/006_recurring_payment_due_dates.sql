-- Persist exact due dates while keeping existing debt schedules un-inferred.
alter table public.debts
  add column next_due_date date,
  add column due_day smallint check (due_day between 1 and 31);

create table public.recurring_obligations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  notes text,
  expected_amount numeric(12,2) not null check (expected_amount > 0),
  currency text not null check (currency in ('CRC', 'USD')),
  expected_amount_crc numeric(12,2) not null check (expected_amount_crc > 0),
  category_id uuid not null references public.categories,
  transaction_type text not null default 'personal'
    check (transaction_type in ('personal', 'household', 'reimbursement')),
  payment_account_id uuid references public.payment_accounts,
  next_due_date date not null,
  due_day smallint not null check (due_day between 1 and 31),
  interval_months smallint not null default 1
    check (interval_months in (1, 2, 3, 6, 12)),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index recurring_obligations_user_active_due_idx
  on public.recurring_obligations (user_id, is_active, next_due_date);

alter table public.transactions
  add column recurring_obligation_id uuid
    references public.recurring_obligations(id) on delete set null,
  add column scheduled_due_date date,
  add constraint transactions_single_scheduled_source_check
    check (not (debt_id is not null and recurring_obligation_id is not null));

create index transactions_recurring_obligation_id_idx
  on public.transactions (recurring_obligation_id)
  where recurring_obligation_id is not null;

create unique index transactions_debt_due_unique_idx
  on public.transactions (debt_id, scheduled_due_date)
  where debt_id is not null and scheduled_due_date is not null;

create unique index transactions_recurring_due_unique_idx
  on public.transactions (recurring_obligation_id, scheduled_due_date)
  where recurring_obligation_id is not null and scheduled_due_date is not null;

alter table public.recurring_obligations enable row level security;

create policy "recurring obligations: user crud"
  on public.recurring_obligations for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger recurring_obligations_set_updated_at
  before update on public.recurring_obligations
  for each row execute function public.set_transactions_updated_at();
