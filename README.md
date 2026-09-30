# Finanzas App

App personal de control de finanzas: ingresos, gastos, tarjetas, deudas y fondos de ahorro, con totales en colones (CRC) y conversión de USD con la tasa del BCCR.

> Repositorio privado, en desarrollo. El trabajo activo ocurre en la rama `dev`; `main` se mantiene estable.

## Stack

- [Next.js](https://nextjs.org) 16 (App Router) + React 19 + TypeScript
- [Supabase](https://supabase.com) (Postgres, Auth, RLS por `user_id`)
- Tailwind CSS 4, shadcn/ui, ApexCharts
- Vitest + Testing Library

> Esta versión de Next.js tiene cambios incompatibles con versiones anteriores. Antes de escribir código, lee la guía relevante en `node_modules/next/dist/docs/` (ver `AGENTS.md`).

## Modelo de dinero

Las transacciones (`transactions`) son la fuente de verdad de lo que realmente entró o salió. Deudas, fondos de ahorro e `income_config` son planificación: cuando un evento se materializa se crea o enlaza una transacción. Detalle, KPIs y reglas en [`docs/money-model.md`](docs/money-model.md).

## Empezar

Requisitos: Node 20+, un proyecto de Supabase.

```bash
npm install
cp .env.example .env.local   # completar las variables
npm run dev                  # http://localhost:3000
```

### Variables de entorno

| Variable | Uso |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública (anon) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio, solo servidor. Nunca exponerla al cliente |
| `BCCR_INDICATOR_EMAIL` / `BCCR_INDICATOR_TOKEN` | Credenciales del servicio de indicadores del BCCR (tipo de cambio) |

`.env*` está en `.gitignore`: no se commitean secretos.

### Base de datos

Las migraciones están en `supabase/migrations/` y se aplican en orden numérico (`001` … `004`). `supabase/seed.sql` contiene datos de ejemplo. Al registrarse un usuario, un trigger crea sus categorías por defecto.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Build y servidor de producción |
| `npm run lint` | ESLint |
| `npm test` / `npm run test:run` | Vitest (modo watch / una sola pasada) |

También hay `Dockerfile` y `docker-compose.yml` para correr la app en un contenedor (`docker compose up --build`, usa `.env.local`).

## Estructura

```
app/            Rutas (App Router): (auth), (dashboard), api
components/     UI (dashboard, layout, ui)
lib/            Lógica de dominio (ledger, deudas, ahorro, reportes, BCCR) y sus tests
supabase/       Migraciones y seed
docs/           Modelo de dinero y specs de diseño
types/          Tipos de base de datos y de dominio
```

## En camino: ingesta automática desde el correo

Un worker local leerá las alertas de compra de BAC, Promerica y DAVIbank desde el buzón, las parseará con reglas por banco, sugerirá la categoría con un modelo local (Ollama) y creará la transacción en el ledger sin salir de la máquina del usuario. El diseño vive en `docs/superpowers/specs/`.

## Flujo de trabajo

- `main`: estable.
- `dev`: integración y trabajo activo. Las ramas de funcionalidad salen de `dev`.
- Commits en formato [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:` …).
