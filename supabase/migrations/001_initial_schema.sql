-- 001_initial_schema.sql

create table public.exchange_rates (
  id            uuid primary key default gen_random_uuid(),
  date          date unique not null,
  usd_to_crc    decimal(10,4) not null,
  source        text not null default 'bccr',
  created_at    timestamptz not null default now()
);

create table public.categories (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid references auth.users not null,
  name                    text not null,
  type                    text not null check (type in ('fixed_expense','variable_expense','savings','income')),
  color                   text not null default '#6b7280',
  icon                    text,
  monthly_budget_amount   decimal(12,2),
  monthly_budget_currency text not null default 'CRC' check (monthly_budget_currency in ('CRC','USD')),
  is_active               boolean not null default true,
  sort_order              integer not null default 0,
  created_at              timestamptz not null default now()
);

create table public.payment_accounts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users not null,
  name            text not null,
  type            text not null check (type in ('credit_card','bank_account')),
  last_four       text,
  bank_name       text,
  closing_day     integer check (closing_day between 1 and 31),
  payment_due_day integer check (payment_due_day between 1 and 31),
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

create table public.transactions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references auth.users not null,
  date               date not null,
  description        text not null,
  amount             decimal(12,2) not null,
  currency           text not null default 'CRC' check (currency in ('CRC','USD')),
  amount_crc         decimal(12,2) not null,
  exchange_rate_id   uuid references public.exchange_rates,
  category_id        uuid references public.categories not null,
  payment_account_id uuid references public.payment_accounts,
  transaction_type   text not null default 'personal'
                       check (transaction_type in ('personal','household','reimbursement')),
  tags               text[] not null default '{}',
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table public.savings_funds (
  id                            uuid primary key default gen_random_uuid(),
  user_id                       uuid references auth.users not null,
  name                          text not null,
  goal_amount                   decimal(12,2) not null,
  goal_currency                 text not null default 'CRC' check (goal_currency in ('CRC','USD')),
  goal_amount_crc               decimal(12,2) not null,
  current_amount_crc            decimal(12,2) not null default 0,
  target_date                   date not null,
  monthly_contribution_amount   decimal(12,2),
  monthly_contribution_currency text check (monthly_contribution_currency in ('CRC','USD')),
  color                         text,
  is_active                     boolean not null default true,
  created_at                    timestamptz not null default now()
);

create table public.savings_contributions (
  id               uuid primary key default gen_random_uuid(),
  fund_id          uuid references public.savings_funds not null,
  user_id          uuid references auth.users not null,
  date             date not null,
  amount           decimal(12,2) not null,
  currency         text not null default 'CRC' check (currency in ('CRC','USD')),
  amount_crc       decimal(12,2) not null,
  exchange_rate_id uuid references public.exchange_rates,
  notes            text,
  created_at       timestamptz not null default now()
);

create table public.debts (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references auth.users not null,
  name               text not null,
  monthly_amount     decimal(12,2) not null,
  currency           text not null default 'CRC' check (currency in ('CRC','USD')),
  monthly_amount_crc decimal(12,2) not null,
  total_installments integer not null,
  paid_installments  integer not null default 0,
  start_date         date not null,
  payment_account_id uuid references public.payment_accounts,
  is_active          boolean not null default true,
  created_at         timestamptz not null default now()
);

create table public.income_config (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid references auth.users not null,
  first_payment_amount  decimal(12,2) not null,
  first_payment_day     integer not null check (first_payment_day between 1 and 31),
  second_payment_amount decimal(12,2),
  second_payment_day    integer check (second_payment_day between 1 and 31),
  currency              text not null default 'CRC',
  effective_from        date not null,
  created_at            timestamptz not null default now()
);

-- Índices de rendimiento
create index on public.transactions (user_id, date desc);
create index on public.transactions (category_id);
create index on public.savings_contributions (fund_id);
create index on public.debts (user_id, is_active);
create index on public.income_config (user_id, effective_from desc);
