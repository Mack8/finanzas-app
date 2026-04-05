-- 002_rls_policies.sql

-- Habilitar RLS en todas las tablas de usuario
alter table public.categories          enable row level security;
alter table public.payment_accounts    enable row level security;
alter table public.transactions        enable row level security;
alter table public.savings_funds       enable row level security;
alter table public.savings_contributions enable row level security;
alter table public.debts               enable row level security;
alter table public.income_config       enable row level security;
-- exchange_rates es compartida (sin user_id), solo lectura pública
alter table public.exchange_rates      enable row level security;

-- exchange_rates: lectura para todos los autenticados, escritura solo service_role
create policy "exchange_rates: authenticated read"
  on public.exchange_rates for select
  to authenticated using (true);

-- categories
create policy "categories: user crud"
  on public.categories for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- payment_accounts
create policy "payment_accounts: user crud"
  on public.payment_accounts for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- transactions
create policy "transactions: user crud"
  on public.transactions for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- savings_funds
create policy "savings_funds: user crud"
  on public.savings_funds for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- savings_contributions
create policy "savings_contributions: user crud"
  on public.savings_contributions for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- debts
create policy "debts: user crud"
  on public.debts for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- income_config
create policy "income_config: user crud"
  on public.income_config for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
