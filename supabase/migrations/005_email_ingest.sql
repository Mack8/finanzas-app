-- 005_email_ingest.sql
-- Ingesta automática desde el correo: origen/referencia externa en transactions,
-- reglas comercio → categoría aprendidas y registro de correos procesados.

alter table public.transactions
  add column if not exists source text check (source is null or source in ('email'));

alter table public.transactions
  add column if not exists external_ref text;

-- Una compra (banco + autorización + referencia) solo puede existir una vez por usuario.
create unique index if not exists transactions_user_external_ref_uidx
  on public.transactions (user_id, external_ref)
  where external_ref is not null;

create table if not exists public.merchant_rules (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade,
  merchant_key text not null,
  category_id  uuid not null references public.categories(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (user_id, merchant_key)
);

create table if not exists public.email_ingest_log (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users on delete cascade,
  message_id     text not null,
  bank           text,
  status         text not null check (status in ('created','duplicate','unparsed','error')),
  subject        text,
  detail         text,
  transaction_id uuid references public.transactions(id) on delete set null,
  created_at     timestamptz not null default now(),
  unique (user_id, message_id)
);

create index if not exists email_ingest_log_user_status_idx
  on public.email_ingest_log (user_id, status, created_at desc);

alter table public.merchant_rules   enable row level security;
alter table public.email_ingest_log enable row level security;

create policy "merchant_rules: user crud"
  on public.merchant_rules for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- El worker escribe con la service role; el usuario solo lee su propio registro.
create policy "email_ingest_log: user read"
  on public.email_ingest_log for select
  to authenticated
  using (auth.uid() = user_id);
