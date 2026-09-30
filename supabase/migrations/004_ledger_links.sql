-- 004_ledger_links.sql
-- Ledger único: enlaces deuda/aporte, notes en deudas, currency check, helpers atómicos

-- Link transactions → debts / contributions
alter table public.transactions
  add column if not exists debt_id uuid references public.debts(id) on delete set null;

alter table public.transactions
  add column if not exists savings_contribution_id uuid references public.savings_contributions(id) on delete set null;

create index if not exists transactions_debt_id_idx
  on public.transactions (debt_id)
  where debt_id is not null;

create index if not exists transactions_savings_contribution_id_idx
  on public.transactions (savings_contribution_id)
  where savings_contribution_id is not null;

create index if not exists transactions_user_date_idx
  on public.transactions (user_id, date desc);

-- Debt notes (UI already collects them)
alter table public.debts
  add column if not exists notes text;

-- Income currency integrity
alter table public.income_config
  drop constraint if exists income_config_currency_check;

alter table public.income_config
  add constraint income_config_currency_check
  check (currency in ('CRC', 'USD'));

-- Keep updated_at fresh on transaction updates
create or replace function public.set_transactions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists transactions_set_updated_at on public.transactions;
create trigger transactions_set_updated_at
  before update on public.transactions
  for each row
  execute function public.set_transactions_updated_at();

-- Atomic: insert contribution + bump fund balance
create or replace function public.apply_savings_contribution(
  p_fund_id uuid,
  p_user_id uuid,
  p_date date,
  p_amount numeric,
  p_currency text,
  p_amount_crc numeric,
  p_exchange_rate_id uuid,
  p_notes text
)
returns public.savings_contributions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fund public.savings_funds;
  v_row public.savings_contributions;
  v_new_balance numeric;
begin
  select * into v_fund
  from public.savings_funds
  where id = p_fund_id and user_id = p_user_id
  for update;

  if not found then
    raise exception 'Fondo no encontrado';
  end if;

  insert into public.savings_contributions (
    fund_id, user_id, date, amount, currency, amount_crc, exchange_rate_id, notes
  ) values (
    p_fund_id, p_user_id, p_date, p_amount, p_currency, p_amount_crc, p_exchange_rate_id, p_notes
  )
  returning * into v_row;

  v_new_balance := coalesce(v_fund.current_amount_crc, 0) + p_amount_crc;

  update public.savings_funds
  set
    current_amount_crc = v_new_balance,
    is_active = case
      when v_fund.goal_amount_crc > 0 and v_new_balance >= v_fund.goal_amount_crc then false
      else v_fund.is_active
    end
  where id = p_fund_id and user_id = p_user_id;

  return v_row;
end;
$$;

revoke all on function public.apply_savings_contribution from public;
grant execute on function public.apply_savings_contribution to authenticated;

-- Atomic reverse contribution
create or replace function public.revert_savings_contribution(
  p_contribution_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contrib public.savings_contributions;
  v_fund public.savings_funds;
begin
  select * into v_contrib
  from public.savings_contributions
  where id = p_contribution_id and user_id = p_user_id;

  if not found then
    raise exception 'Aporte no encontrado';
  end if;

  select * into v_fund
  from public.savings_funds
  where id = v_contrib.fund_id and user_id = p_user_id
  for update;

  if not found then
    raise exception 'Fondo no encontrado';
  end if;

  delete from public.transactions
  where savings_contribution_id = p_contribution_id
    and user_id = p_user_id;

  delete from public.savings_contributions
  where id = p_contribution_id
    and user_id = p_user_id;

  update public.savings_funds
  set
    current_amount_crc = greatest(0, coalesce(current_amount_crc, 0) - v_contrib.amount_crc),
    is_active = true
  where id = v_contrib.fund_id
    and user_id = p_user_id;
end;
$$;

revoke all on function public.revert_savings_contribution from public;
grant execute on function public.revert_savings_contribution to authenticated;
