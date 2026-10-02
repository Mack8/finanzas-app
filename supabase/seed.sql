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
  );

insert into auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at) values
  ('11111111-aaaa-aaaa-aaaa-111111111111', 'dev@finanzas.local', '11111111-1111-1111-1111-111111111111', '{"sub":"11111111-1111-1111-1111-111111111111","email":"dev@finanzas.local"}', 'email', now(), now()),
  ('22222222-aaaa-aaaa-aaaa-222222222222', 'other@finanzas.local', '22222222-2222-2222-2222-222222222222', '{"sub":"22222222-2222-2222-2222-222222222222","email":"other@finanzas.local"}', 'email', now(), now());

insert into public.exchange_rates (id, date, usd_to_crc, source) values
  ('33333333-3333-3333-3333-333333333333', current_date, 520.00, 'seed');

insert into public.payment_accounts (id, user_id, name, type, last_four, bank_name) values
  ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Tarjeta local', 'credit_card', '1234', 'Banco de prueba');

insert into public.transactions (
  id, user_id, date, description, amount, currency, amount_crc, exchange_rate_id, category_id, payment_account_id
) values
  (
    '55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', current_date,
    'Compra de ejemplo', 12500.00, 'CRC', 12500.00, null,
    (select id from public.categories where user_id = '11111111-1111-1111-1111-111111111111' and name = 'Alimentación'),
    '44444444-4444-4444-4444-444444444444'
  ),
  (
    '66666666-6666-6666-6666-666666666666', '22222222-2222-2222-2222-222222222222', current_date,
    'Transacción ajena', 99.00, 'USD', 51480.00, '33333333-3333-3333-3333-333333333333',
    (select id from public.categories where user_id = '22222222-2222-2222-2222-222222222222' and name = 'Compras'),
    null
  );
