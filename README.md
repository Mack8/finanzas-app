# Finanzas App

**English:** a personal finance app built with Next.js 16, React 19, TypeScript and Supabase (Postgres with per-user row-level security). It tracks income, expenses, cards, debts, savings funds and recurring payments, shows totals in Costa Rican colones (CRC) and converts USD using the central bank (BCCR) exchange rate. A local worker can read purchase alerts from three Costa Rican banks, parse them with per-bank rules and record them as transactions. The project has 400+ automated tests (Vitest). All data in this repository is synthetic. The detailed documentation below is in Spanish.

App personal de control de finanzas: ingresos, gastos, tarjetas, deudas y fondos de ahorro, con totales en colones (CRC) y conversión de USD con la tasa del BCCR.

> Proyecto personal en desarrollo. Los datos de ejemplo, los correos de prueba y los números de tarjeta o autorización de este repositorio son sintéticos.

## Stack

- [Next.js](https://nextjs.org) 16 (App Router) + React 19 + TypeScript
- [Supabase](https://supabase.com) (Postgres, Auth, RLS por `user_id`)
- Tailwind CSS 4, shadcn/ui, ApexCharts
- Vitest + Testing Library

> Esta versión de Next.js tiene cambios incompatibles con versiones anteriores. Antes de escribir código, lee la guía relevante en `node_modules/next/dist/docs/` (ver `AGENTS.md`).

## Modelo de dinero

Las transacciones (`transactions`) son la fuente de verdad de lo que realmente entró o salió. Deudas, fondos de ahorro e `income_config` son planificación: cuando un evento se materializa se crea o enlaza una transacción. Detalle, KPIs y reglas en [`docs/money-model.md`](docs/money-model.md).

Estado del proyecto, comprobaciones recientes y próximos pasos: [`docs/estado-proyecto.md`](docs/estado-proyecto.md).

## Pagos y vencimientos

La sección **Pagos** reúne cuotas de deuda, obligaciones recurrentes y recordatorios de tarjetas. Permite ajustar el importe real de un servicio, consultar pagos registrados y configurar la próxima fecha de deudas antiguas. Las frecuencias admitidas son 1, 2, 3, 6 y 12 meses.

Registrar un pago crea el movimiento y avanza el vencimiento dentro de una sola transacción de base de datos. El día ancla se conserva al pasar por meses cortos; los reintentos no duplican el mismo vencimiento. El dashboard reserva los compromisos impagos del mes y deja de reservarlos cuando se pagan. Las tarjetas muestran únicamente recordatorios sin importe ni liquidación contable.

## Dashboard: control del periodo

El dashboard presenta primero el margen seguro: saldo registrado del mes menos cuotas y aportes pendientes. Luego muestra una acción prioritaria, el ritmo de gasto, la categoría que más aporta al gasto y la salud de ahorro y deudas. El horizonte es fin de mes, incluido hoy.

El monto proyectado agrega únicamente el ingreso mensual configurado aún no registrado (mínimo cero); es una estimación sin fecha de cobro y no dinero disponible. Si faltan ingresos configurados o movimientos, se muestra el paso para completar los datos. Los gráficos y el histórico se consultan en Reportes. Calm Ledger usa superficies verde bosque suave y salvia, verde para disponibilidad y progreso, azul para acciones y enlaces, ámbar para atención/compromisos pendientes y coral para riesgo, con etiquetas de estado y una variante clara seleccionable.

## Empezar en local

Requisitos: Node 20+, Docker Desktop o Docker Engine con Compose. No necesitás un proyecto remoto de Supabase para desarrollar o ejecutar las pruebas.

```bash
npm ci
npm run supabase:start
npm run supabase:env
npm run supabase:reset
npm run dev:local
```

La app queda en http://localhost:3000. El reset aplica las migraciones `001` a `009` y crea únicamente datos sintéticos, incluido el usuario `dev@finanzas.local` con contraseña `finanzas-local-dev`.

### Ciclo diario y servicios locales

| Comando o servicio | Uso |
|---|---|
| `npm run dev:local` | Inicia Supabase, sincroniza `.env.local` y abre Next.js. |
| `npm run supabase:reset` | Reconstruye la base local desde migraciones y seed sintético. |
| `npm run supabase:verify` | Comprueba login local, lectura autenticada y aislamiento RLS. |
| `npm run supabase:stop` | Detiene los contenedores locales. |
| API | http://127.0.0.1:54321 |
| Postgres | `127.0.0.1:54322` |
| Studio | http://127.0.0.1:54323 |
| Inbucket (correos locales) | http://127.0.0.1:54324 |

El registro en `/register` usa Auth local; sus emails de confirmación sólo aparecen en Inbucket. Para cambiar las variables administradas, ejecutá `npm run supabase:env -- --replace` de forma explícita. Si conservás una configuración remota, mantenela como `.env.remote.local`: está ignorada por Git.

### Variables de entorno y entornos remotos

`npm run supabase:env` genera en `.env.local` las URL y claves del stack local. No copies credenciales remotas a `.env.example` ni a Git. `BCCR_INDICATOR_EMAIL`, `BCCR_INDICATOR_TOKEN` y las variables del worker son opcionales para el flujo local y siguen documentadas en `.env.example`.

Staging y producción usarán sus propias variables configuradas directamente en el proveedor elegido. Actualmente no existe CD: el workflow manual de GitHub lo deja explícito hasta seleccionar hosting. La CI ejecuta una instancia efímera local de Supabase y nunca inicia sesión, enlaza ni modifica proyectos remotos.

### Base de datos

Las migraciones están en `supabase/migrations/` y se aplican en orden numérico (`001` … `009`). `supabase/seed.sql` contiene exclusivamente datos de desarrollo repetibles. Al registrarse un usuario, un trigger crea sus categorías por defecto.

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

## Ingesta automática desde el correo

Un worker local lee las alertas de compra de BAC, Promerica y DAVIbank desde el buzón, las parsea con reglas por banco, sugiere la categoría con un modelo local (Ollama) y crea la transacción en el ledger sin salir de la máquina del usuario. El diseño vive en `docs/superpowers/specs/`.

`worker/local-db/` se conserva como fixture especializado para los smoke tests del worker (Postgres + PostgREST, puertos 54329/54330). No reemplaza el stack completo de Supabase local descrito arriba; su guía está en [`worker/README.md`](worker/README.md).

## Flujo de trabajo

- `main`: estable.
- `dev`: integración y trabajo activo. Las ramas de funcionalidad salen de `dev`.
- Commits en formato [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:` …).
