-- Keep scheduled occurrences attached to their owner's records and immutable
-- with respect to their schedule identity after they enter the ledger.
create or replace function public.guard_recurring_obligation_references()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.categories c
    where c.id = new.category_id and c.user_id = new.user_id
  ) then
    raise exception 'La categoría no pertenece al usuario';
  end if;

  if new.payment_account_id is not null and not exists (
    select 1 from public.payment_accounts a
    where a.id = new.payment_account_id and a.user_id = new.user_id
  ) then
    raise exception 'La cuenta no pertenece al usuario';
  end if;

  return new;
end;
$$;

create trigger recurring_obligations_guard_references
  before insert or update of user_id, category_id, payment_account_id
  on public.recurring_obligations
  for each row execute function public.guard_recurring_obligation_references();

create or replace function public.guard_scheduled_transaction_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if old.scheduled_due_date is not null then
      raise exception 'Los pagos programados no se pueden eliminar del historial';
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' and old.scheduled_due_date is not null and (
    new.user_id is distinct from old.user_id
    or new.debt_id is distinct from old.debt_id
    or new.recurring_obligation_id is distinct from old.recurring_obligation_id
    or new.scheduled_due_date is distinct from old.scheduled_due_date
  ) then
    raise exception 'La identidad de un pago programado no se puede modificar';
  end if;

  if new.debt_id is not null and not exists (
    select 1 from public.debts d
    where d.id = new.debt_id and d.user_id = new.user_id
  ) then
    raise exception 'La deuda no pertenece al usuario';
  end if;

  if new.recurring_obligation_id is not null and not exists (
    select 1 from public.recurring_obligations r
    where r.id = new.recurring_obligation_id and r.user_id = new.user_id
  ) then
    raise exception 'La obligación no pertenece al usuario';
  end if;

  return new;
end;
$$;

create trigger transactions_guard_scheduled_integrity
  before insert or update or delete on public.transactions
  for each row execute function public.guard_scheduled_transaction_integrity();

revoke all on function public.guard_recurring_obligation_references() from public, authenticated;
revoke all on function public.guard_scheduled_transaction_integrity() from public, authenticated;
