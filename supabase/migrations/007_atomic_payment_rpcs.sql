create or replace function public.advance_payment_due_date(
  p_current_due_date date,
  p_interval_months integer,
  p_due_day integer
)
returns date
language plpgsql
immutable
strict
set search_path = public
as $$
declare
  v_month_start date;
  v_last_day integer;
begin
  if p_interval_months not in (1, 2, 3, 6, 12) then
    raise exception 'Intervalo de pago inválido';
  end if;
  if p_due_day not between 1 and 31 then
    raise exception 'Día de vencimiento inválido';
  end if;

  v_month_start := date_trunc('month', p_current_due_date)::date
    + make_interval(months => p_interval_months);
  v_last_day := extract(day from (v_month_start + interval '1 month' - interval '1 day'))::integer;
  return make_date(
    extract(year from v_month_start)::integer,
    extract(month from v_month_start)::integer,
    least(p_due_day, v_last_day)
  );
end;
$$;

create or replace function public.pay_debt_installment(
  p_debt_id uuid,
  p_scheduled_due_date date,
  p_paid_on date,
  p_amount numeric,
  p_amount_crc numeric,
  p_currency text,
  p_exchange_rate_id uuid,
  p_category_id uuid,
  p_payment_account_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_debt public.debts;
  v_exchange_rate numeric;
  v_transaction_id uuid;
  v_next_paid integer;
begin
  if v_user_id is null then
    raise exception 'Sesión no válida';
  end if;
  if p_amount <= 0 or p_amount_crc <= 0 then
    raise exception 'El monto debe ser mayor a cero';
  end if;

  select * into v_debt
  from public.debts
  where id = p_debt_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Deuda no encontrada';
  end if;
  if not v_debt.is_active or v_debt.paid_installments >= v_debt.total_installments then
    raise exception 'La deuda ya está completada';
  end if;
  if v_debt.next_due_date is null or v_debt.due_day is null
     or p_scheduled_due_date is distinct from v_debt.next_due_date then
    raise exception 'La fecha de vencimiento cambió';
  end if;
  if p_currency is distinct from v_debt.currency
     or p_amount is distinct from v_debt.monthly_amount
     or p_payment_account_id is distinct from v_debt.payment_account_id then
    raise exception 'Los datos del pago no coinciden con la deuda';
  end if;

  if not exists (
    select 1 from public.categories c
    where c.id = p_category_id and c.user_id = v_user_id
      and c.is_active and c.type = 'fixed_expense'
  ) then
    raise exception 'Categoría de pago no válida';
  end if;
  if p_payment_account_id is not null and not exists (
    select 1 from public.payment_accounts a
    where a.id = p_payment_account_id and a.user_id = v_user_id
  ) then
    raise exception 'Cuenta de pago no válida';
  end if;

  if v_debt.currency = 'CRC' then
    if p_exchange_rate_id is not null or p_amount_crc <> round(p_amount, 2) then
      raise exception 'Conversión de moneda inválida';
    end if;
  else
    select usd_to_crc into v_exchange_rate
    from public.exchange_rates where id = p_exchange_rate_id;
    if not found or p_amount_crc <> round(p_amount * v_exchange_rate, 2) then
      raise exception 'Tipo de cambio inválido';
    end if;
  end if;

  insert into public.transactions (
    user_id, date, description, amount, currency, amount_crc, exchange_rate_id,
    category_id, payment_account_id, transaction_type, tags, notes,
    debt_id, scheduled_due_date
  ) values (
    v_user_id,
    p_paid_on,
    format('Cuota %s/%s · %s', v_debt.paid_installments + 1, v_debt.total_installments, v_debt.name),
    p_amount,
    p_currency,
    p_amount_crc,
    p_exchange_rate_id,
    p_category_id,
    p_payment_account_id,
    'personal',
    array['debt-payment'],
    null,
    v_debt.id,
    p_scheduled_due_date
  ) returning id into v_transaction_id;

  v_next_paid := v_debt.paid_installments + 1;
  update public.debts
  set paid_installments = v_next_paid,
      is_active = v_next_paid < v_debt.total_installments,
      next_due_date = public.advance_payment_due_date(v_debt.next_due_date, 1, v_debt.due_day)
  where id = v_debt.id and user_id = v_user_id;

  return v_transaction_id;
end;
$$;

create or replace function public.pay_recurring_obligation(
  p_obligation_id uuid,
  p_scheduled_due_date date,
  p_paid_on date,
  p_amount numeric,
  p_amount_crc numeric,
  p_currency text,
  p_exchange_rate_id uuid,
  p_category_id uuid,
  p_payment_account_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_obligation public.recurring_obligations;
  v_exchange_rate numeric;
  v_transaction_id uuid;
begin
  if v_user_id is null then
    raise exception 'Sesión no válida';
  end if;
  if p_amount <= 0 or p_amount_crc <= 0 then
    raise exception 'El monto debe ser mayor a cero';
  end if;

  select * into v_obligation
  from public.recurring_obligations
  where id = p_obligation_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Pago recurrente no encontrado';
  end if;
  if not v_obligation.is_active then
    raise exception 'El pago recurrente está inactivo';
  end if;
  if p_scheduled_due_date is distinct from v_obligation.next_due_date then
    raise exception 'La fecha de vencimiento cambió';
  end if;
  if p_currency is distinct from v_obligation.currency
     or p_category_id is distinct from v_obligation.category_id
     or p_payment_account_id is distinct from v_obligation.payment_account_id then
    raise exception 'Los datos del pago no coinciden con la obligación';
  end if;

  if not exists (
    select 1 from public.categories c
    where c.id = p_category_id and c.user_id = v_user_id
      and c.type in ('fixed_expense', 'variable_expense')
  ) then
    raise exception 'Categoría de pago no válida';
  end if;
  if p_payment_account_id is not null and not exists (
    select 1 from public.payment_accounts a
    where a.id = p_payment_account_id and a.user_id = v_user_id
  ) then
    raise exception 'Cuenta de pago no válida';
  end if;

  if v_obligation.currency = 'CRC' then
    if p_exchange_rate_id is not null or p_amount_crc <> round(p_amount, 2) then
      raise exception 'Conversión de moneda inválida';
    end if;
  else
    select usd_to_crc into v_exchange_rate
    from public.exchange_rates where id = p_exchange_rate_id;
    if not found or p_amount_crc <> round(p_amount * v_exchange_rate, 2) then
      raise exception 'Tipo de cambio inválido';
    end if;
  end if;

  insert into public.transactions (
    user_id, date, description, amount, currency, amount_crc, exchange_rate_id,
    category_id, payment_account_id, transaction_type, tags, notes,
    recurring_obligation_id, scheduled_due_date
  ) values (
    v_user_id,
    p_paid_on,
    format('Pago recurrente · %s', v_obligation.name),
    p_amount,
    p_currency,
    p_amount_crc,
    p_exchange_rate_id,
    p_category_id,
    p_payment_account_id,
    v_obligation.transaction_type,
    array['recurring-payment'],
    v_obligation.notes,
    v_obligation.id,
    p_scheduled_due_date
  ) returning id into v_transaction_id;

  update public.recurring_obligations
  set next_due_date = public.advance_payment_due_date(
        v_obligation.next_due_date,
        v_obligation.interval_months,
        v_obligation.due_day
      )
  where id = v_obligation.id and user_id = v_user_id;

  return v_transaction_id;
end;
$$;

revoke all on function public.advance_payment_due_date(date, integer, integer) from public;
revoke all on function public.pay_debt_installment(uuid, date, date, numeric, numeric, text, uuid, uuid, uuid) from public;
revoke all on function public.pay_recurring_obligation(uuid, date, date, numeric, numeric, text, uuid, uuid, uuid) from public;
grant execute on function public.advance_payment_due_date(date, integer, integer) to authenticated;
grant execute on function public.pay_debt_installment(uuid, date, date, numeric, numeric, text, uuid, uuid, uuid) to authenticated;
grant execute on function public.pay_recurring_obligation(uuid, date, date, numeric, numeric, text, uuid, uuid, uuid) to authenticated;
