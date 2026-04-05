-- 003_default_categories_trigger.sql
-- Cuando un usuario se registra, se crean categorías por defecto automáticamente.

create or replace function public.create_default_categories()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.categories (user_id, name, type, color, sort_order) values
    -- Ingresos
    (new.id, 'Salario',        'income',           '#22c55e', 0),
    -- Gastos fijos
    (new.id, 'Leasing',        'fixed_expense',    '#ef4444', 10),
    (new.id, 'Servicios',      'fixed_expense',    '#f97316', 11),
    (new.id, 'Suscripciones',  'fixed_expense',    '#a855f7', 12),
    (new.id, 'Cuotas',         'fixed_expense',    '#ec4899', 13),
    -- Gastos variables
    (new.id, 'Alimentación',   'variable_expense', '#eab308', 20),
    (new.id, 'Compras',        'variable_expense', '#06b6d4', 21),
    (new.id, 'Ocio',           'variable_expense', '#3b82f6', 22),
    (new.id, 'Social',         'variable_expense', '#8b5cf6', 23),
    (new.id, 'Transporte',     'variable_expense', '#14b8a6', 24),
    (new.id, 'Salud',          'variable_expense', '#f43f5e', 25),
    -- Ahorro
    (new.id, 'Emergencia',     'savings',          '#10b981', 30),
    (new.id, 'Viajes',         'savings',          '#0ea5e9', 31),
    (new.id, 'Tecnología',     'savings',          '#6366f1', 32);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.create_default_categories();
