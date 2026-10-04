# Worker de ingesta de correo

Lee las alertas de compra de BAC, Promerica y DAVIbank desde Hotmail y crea transacciones en el ledger. Corre en tu máquina; los correos y el modelo de IA no salen de ella.

## Requisitos

- Ollama corriendo con el modelo (`ollama pull qwen3:14b`).
- Migración `005_email_ingest.sql` aplicada en Supabase.
- Una app registrada en Azure (una sola vez, gratis).
- `WORKER_USER_ID`: el `id` de tu usuario en Supabase (Authentication → Users).

## Registrar la app en Azure (una sola vez)

1. Entrá a https://entra.id → **App registrations** → **New registration**. Si es la primera vez, Microsoft te pide crear un directorio gratuito.
2. Nombre: `finanzas-worker`. En **Supported account types** elegí **Personal Microsoft accounts only**. Sin Redirect URI.
3. En **Authentication** → **Advanced settings** → **Allow public client flows** = **Yes**. Guardar.
4. En **API permissions** → **Add a permission** → **Microsoft Graph** → **Delegated** → `Mail.Read` (y `offline_access`).
5. Copiá el **Application (client) ID** a `MS_CLIENT_ID` en `.env.local`.

## Uso

```bash
npm run worker:login        # inicia sesión con código de dispositivo (una vez, config local)
npm run worker:login:remote # sesión para ensayos contra .env.remote.local
npm run worker:dry -- --days 14   # ensayo: lee el buzón e imprime, NO escribe nada
npm run worker:dry:remote -- --days 14 # mismo ensayo con la configuración de .env.remote.local
npm run worker              # ciclo continuo cada POLL_MINUTES minutos
npm run worker -- --once    # un solo ciclo y termina
npm run worker:eval         # mide el modelo con comercios de ejemplo
```

`worker/senders.json` lista los remitentes permitidos por banco (la dirección "De" exacta de cada banco).

## Estado local (`worker/.state/`, ignorado por git)

- `token.json`: sesión de Microsoft (permisos 600). Si vence: `npm run worker:login`.
- `cursor.json`: hasta dónde se leyó. Se puede borrar: se relee una ventana reciente y el registro evita duplicados.

El modo `--dry-run` solo acepta tasas ya guardadas en Supabase de los últimos siete días. No siembra tasas ni renueva tokens; si Microsoft venció el token, corré `npm run worker:login` antes del ensayo. `worker:dry:remote` carga explícitamente `.env.remote.local` y mantiene `.env.local` intacto.

## Probar contra una base local

`worker/local-db/` levanta Postgres + PostgREST (la API que usa `supabase-js`) en Docker, con las migraciones 001 a 005 y datos de prueba. Solo escucha en `127.0.0.1` (Postgres 54329, API 54330). No toca la base real.

```bash
docker compose -f worker/local-db/docker-compose.yml up -d db
docker compose -f worker/local-db/docker-compose.yml exec -T db psql -U postgres -q < worker/local-db/bootstrap.sql
for f in supabase/migrations/00*.sql; do docker compose -f worker/local-db/docker-compose.yml exec -T db psql -U postgres -q < "$f"; done
docker compose -f worker/local-db/docker-compose.yml exec -T db psql -U postgres -q < worker/local-db/seed.sql
docker compose -f worker/local-db/docker-compose.yml up -d api
npm run worker:smoke      # correos simulados + Ollama real + capas reales de Supabase + RLS
docker compose -f worker/local-db/docker-compose.yml down -v   # borra todo
```

## Si algo no se leyó

Los correos que no se reconocen quedan en la tabla `email_ingest_log` con estado `unparsed` o `error` y se ven en Configuración de la app. Para reprocesar los `unparsed` tras agregar un parser: borrar esas filas del registro.
