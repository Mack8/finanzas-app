-- Datos de prueba para la base local (no usar en la base real).
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'prueba@local.test'),
  ('00000000-0000-0000-0000-0000000000b2', 'otro@local.test');

-- Una cuenta por banco con los últimos 4 dígitos de los correos de ejemplo.
insert into public.payment_accounts (user_id, name, type, last_four, bank_name) values
  ('00000000-0000-0000-0000-0000000000a1', 'BAC Visa', 'credit_card', '7001', 'BAC Credomatic'),
  ('00000000-0000-0000-0000-0000000000a1', 'Promerica Débito', 'bank_account', '7003', 'Banco Promerica'),
  ('00000000-0000-0000-0000-0000000000a1', 'Davivienda Visa', 'credit_card', '7002', 'DAVIbank');

-- Tipo de cambio para compras en USD.
insert into public.exchange_rates (date, usd_to_crc, source) values ('2026-09-25', 505.2500, 'bccr:venta:318');
