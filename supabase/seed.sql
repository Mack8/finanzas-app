-- Datos exclusivamente sintéticos para desarrollo local.
-- Contraseña de ambos usuarios: finanzas-local-dev
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  phone_change_token, email_change_token_current, reauthentication_token,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
    'authenticated', 'authenticated', 'dev@finanzas.local',
    '$2a$10$KR/zMSSqdVYggbrXR0EnnuLi4/wJgtIXKvGFkU3chm1/OngV13X2e', now(),
    '', '', '', '', '', '', '',
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222',
    'authenticated', 'authenticated', 'other@finanzas.local',
    '$2a$10$KR/zMSSqdVYggbrXR0EnnuLi4/wJgtIXKvGFkU3chm1/OngV13X2e', now(),
    '', '', '', '', '', '', '',
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  )
on conflict (id) do nothing;

-- Escenario de demo del usuario principal para probar el dashboard y los módulos.
-- IDs estables + ON CONFLICT permiten aplicar este seed sin borrar datos locales.
insert into public.exchange_rates (id, date, usd_to_crc, source) values
  ('88888888-0000-4000-8000-000000000001', date '2026-10-01', 510.00, 'seed-demo')
on conflict (date) do nothing;

insert into public.payment_accounts (id, user_id, name, type, last_four, bank_name) values
  ('74000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 'Cuenta diaria (demo)', 'bank_account', '5678', 'Banco de prueba')
on conflict (id) do nothing;

insert into public.income_config (
  id, user_id, first_payment_amount, first_payment_day,
  second_payment_amount, second_payment_day, currency, effective_from
) values (
  '75000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111',
  480000.00, 1, 480000.00, 15, 'CRC', date '2026-10-01'
)
on conflict (id) do nothing;

insert into public.savings_funds (
  id, user_id, name, goal_amount, goal_currency, goal_amount_crc,
  current_amount_crc, target_date, monthly_contribution_amount,
  monthly_contribution_currency, color, is_active
) values
  (
    '72000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111',
    'Fondo de emergencia (demo)', 600000.00, 'CRC', 600000.00,
    140000.00, date '2027-06-30', 40000.00, 'CRC', '#86a789', true
  ),
  (
    '72000000-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111',
    'Viaje terminado (demo)', 200000.00, 'CRC', 200000.00,
    200000.00, date '2026-09-01', 25000.00, 'CRC', '#eab676', false
  )
on conflict (id) do nothing;

insert into public.savings_contributions (
  id, fund_id, user_id, date, amount, currency, amount_crc, notes
) values
  ('72100000-0000-4000-8000-000000000001', '72000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', date '2026-08-01', 50000.00, 'CRC', 50000.00, 'Aporte de ejemplo · agosto'),
  ('72100000-0000-4000-8000-000000000002', '72000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', date '2026-09-01', 50000.00, 'CRC', 50000.00, 'Aporte de ejemplo · septiembre'),
  ('72100000-0000-4000-8000-000000000003', '72000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', date '2026-10-01', 40000.00, 'CRC', 40000.00, 'Aporte de ejemplo · octubre'),
  ('72100000-0000-4000-8000-000000000004', '72000000-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111', date '2026-08-15', 100000.00, 'CRC', 100000.00, 'Meta alcanzada · primera parte'),
  ('72100000-0000-4000-8000-000000000005', '72000000-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111', date '2026-09-01', 100000.00, 'CRC', 100000.00, 'Meta alcanzada · segunda parte')
on conflict (id) do nothing;

insert into public.debts (
  id, user_id, name, monthly_amount, currency, monthly_amount_crc,
  total_installments, paid_installments, start_date, payment_account_id,
  is_active, notes
) values
  (
    '73000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111',
    'Préstamo personal (demo)', 85000.00, 'CRC', 85000.00,
    24, 6, date '2026-01-01', '74000000-0000-4000-8000-000000000001',
    true, 'Dato sintético para probar el registro de cuotas.'
  ),
  (
    '73000000-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111',
    'Compra a plazo completada (demo)', 22000.00, 'CRC', 22000.00,
    12, 12, date '2025-09-01', '74000000-0000-4000-8000-000000000001',
    false, 'Dato sintético en estado completado.'
  )
on conflict (id) do nothing;

insert into public.transactions (
  id, user_id, date, description, amount, currency, amount_crc,
  exchange_rate_id, category_id, payment_account_id, transaction_type,
  tags, notes, savings_contribution_id
) values
  (
    '71000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111',
    date '2026-10-01', 'Salario · primera quincena (demo)', 480000.00, 'CRC', 480000.00,
    null, (select id from public.categories where user_id = '11111111-1111-1111-1111-111111111111' and name = 'Salario' and type = 'income' limit 1),
    null, 'personal', array['demo'], 'Movimiento sintético para el dashboard.', null
  ),
  (
    '71000000-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111',
    date '2026-10-02', 'Compras del hogar (demo)', 42750.00, 'CRC', 42750.00,
    null, (select id from public.categories where user_id = '11111111-1111-1111-1111-111111111111' and name = 'Alimentación' and type = 'variable_expense' limit 1),
    '74000000-0000-4000-8000-000000000001', 'household', array['demo'], 'Gasto sintético con cuenta diaria.', null
  ),
  (
    '71000000-0000-4000-8000-000000000003', '11111111-1111-1111-1111-111111111111',
    date '2026-10-03', 'Suscripción de software (demo)', 18.75, 'USD',
    round(18.75 * (select usd_to_crc from public.exchange_rates where date = date '2026-10-01'), 2),
    (select id from public.exchange_rates where date = date '2026-10-01'),
    (select id from public.categories where user_id = '11111111-1111-1111-1111-111111111111' and name = 'Suscripciones' and type = 'fixed_expense' limit 1),
    '74000000-0000-4000-8000-000000000001', 'personal', array['demo', 'usd'], 'Gasto sintético en dólares.', null
  ),
  (
    '71000000-0000-4000-8000-000000000004', '11111111-1111-1111-1111-111111111111',
    date '2026-10-04', 'Transporte (demo)', 12400.00, 'CRC', 12400.00,
    null, (select id from public.categories where user_id = '11111111-1111-1111-1111-111111111111' and name = 'Transporte' and type = 'variable_expense' limit 1),
    '74000000-0000-4000-8000-000000000001', 'personal', array['demo'], null, null
  ),
  (
    '71000000-0000-4000-8000-000000000005', '11111111-1111-1111-1111-111111111111',
    date '2026-08-01', 'Aporte · Fondo de emergencia (demo)', 50000.00, 'CRC', 50000.00,
    null, (select id from public.categories where user_id = '11111111-1111-1111-1111-111111111111' and name = 'Emergencia' and type = 'savings' limit 1),
    null, 'personal', array['demo', 'savings-contribution'], 'Aporte de ejemplo · agosto.', '72100000-0000-4000-8000-000000000001'
  ),
  (
    '71000000-0000-4000-8000-000000000006', '11111111-1111-1111-1111-111111111111',
    date '2026-09-01', 'Aporte · Fondo de emergencia (demo)', 50000.00, 'CRC', 50000.00,
    null, (select id from public.categories where user_id = '11111111-1111-1111-1111-111111111111' and name = 'Emergencia' and type = 'savings' limit 1),
    null, 'personal', array['demo', 'savings-contribution'], 'Aporte de ejemplo · septiembre.', '72100000-0000-4000-8000-000000000002'
  ),
  (
    '71000000-0000-4000-8000-000000000007', '11111111-1111-1111-1111-111111111111',
    date '2026-10-01', 'Aporte · Fondo de emergencia (demo)', 40000.00, 'CRC', 40000.00,
    null, (select id from public.categories where user_id = '11111111-1111-1111-1111-111111111111' and name = 'Emergencia' and type = 'savings' limit 1),
    null, 'personal', array['demo', 'savings-contribution'], 'Aporte de ejemplo · octubre.', '72100000-0000-4000-8000-000000000003'
  ),
  (
    '71000000-0000-4000-8000-000000000008', '11111111-1111-1111-1111-111111111111',
    date '2026-08-15', 'Aporte · Viaje terminado (demo)', 100000.00, 'CRC', 100000.00,
    null, (select id from public.categories where user_id = '11111111-1111-1111-1111-111111111111' and name = 'Viajes' and type = 'savings' limit 1),
    null, 'personal', array['demo', 'savings-contribution'], 'Meta alcanzada · primera parte.', '72100000-0000-4000-8000-000000000004'
  ),
  (
    '71000000-0000-4000-8000-000000000009', '11111111-1111-1111-1111-111111111111',
    date '2026-09-01', 'Aporte · Viaje terminado (demo)', 100000.00, 'CRC', 100000.00,
    null, (select id from public.categories where user_id = '11111111-1111-1111-1111-111111111111' and name = 'Viajes' and type = 'savings' limit 1),
    null, 'personal', array['demo', 'savings-contribution'], 'Meta alcanzada · segunda parte.', '72100000-0000-4000-8000-000000000005'
  )
on conflict (id) do nothing;

insert into auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at) values
  ('11111111-aaaa-aaaa-aaaa-111111111111', 'dev@finanzas.local', '11111111-1111-1111-1111-111111111111', '{"sub":"11111111-1111-1111-1111-111111111111","email":"dev@finanzas.local"}', 'email', now(), now()),
  ('22222222-aaaa-aaaa-aaaa-222222222222', 'other@finanzas.local', '22222222-2222-2222-2222-222222222222', '{"sub":"22222222-2222-2222-2222-222222222222","email":"other@finanzas.local"}', 'email', now(), now())
on conflict (id) do nothing;

insert into public.exchange_rates (id, date, usd_to_crc, source) values
  ('33333333-3333-3333-3333-333333333333', date '2026-01-15', 520.00, 'seed')
on conflict (id) do nothing;

insert into public.payment_accounts (id, user_id, name, type, last_four, bank_name) values
  ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Tarjeta local', 'credit_card', '1234', 'Banco de prueba')
on conflict (id) do nothing;

insert into public.transactions (
  id, user_id, date, description, amount, currency, amount_crc, exchange_rate_id, category_id, payment_account_id
) values
  (
    '55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', date '2026-01-15',
    'Compra de ejemplo', 12500.00, 'CRC', 12500.00, null,
    (select id from public.categories where user_id = '11111111-1111-1111-1111-111111111111' and name = 'Alimentación'),
    '44444444-4444-4444-4444-444444444444'
  ),
  (
    '66666666-6666-6666-6666-666666666666', '22222222-2222-2222-2222-222222222222', date '2026-01-15',
    'Transacción ajena', 99.00, 'USD', 51480.00, '33333333-3333-3333-3333-333333333333',
    (select id from public.categories where user_id = '22222222-2222-2222-2222-222222222222' and name = 'Compras'),
    null
  )
on conflict (id) do nothing;
