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

  v_month_start := make_date(
    extract(year from p_current_due_date)::integer,
    extract(month from p_current_due_date)::integer,
    1
  ) + make_interval(months => p_interval_months);
  v_last_day := extract(day from (v_month_start + interval '1 month' - interval '1 day'))::integer;
  return make_date(
    extract(year from v_month_start)::integer,
    extract(month from v_month_start)::integer,
    least(p_due_day, v_last_day)
  );
end;
$$;
