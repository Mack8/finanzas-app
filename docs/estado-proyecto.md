# Estado de Finanzas App

Revisión local: 2026-10-08, rama `dev`.

## Qué hace

Control financiero personal con ingresos, gastos, cuentas bancarias y tarjetas,
cuotas de deudas, fondos de ahorro, pagos recurrentes y reportes. Los importes
pueden registrarse en CRC o USD; los totales se presentan en CRC.

El dashboard muestra el saldo registrado del mes y el margen seguro después de
reservar compromisos pendientes. El ingreso configurado que todavía no se ha
registrado aparece como estimación separada. Estas cifras corresponden al periodo
registrado en la app; no son una consulta del saldo bancario.

## Cómo funciona

- Next.js 16, React y TypeScript presentan las pantallas y ejecutan acciones del
  servidor para validar formularios y guardar operaciones.
- Supabase aporta autenticación y PostgreSQL. RLS limita los datos al propietario;
  los flujos de pagos también verifican propiedad de cuenta, categoría y obligación.
- `transactions` es el registro de movimientos realizados. Deudas, obligaciones,
  ahorro e ingreso configurado definen planes; al materializarse generan o enlazan
  movimientos. Los cálculos del dashboard se realizan con código, sin un modelo IA.
- Las funciones PostgreSQL de pago bloquean la obligación, validan el vencimiento,
  crean el movimiento y avanzan la fecha en una transacción. Índices únicos evitan
  dos pagos para la misma obligación y vencimiento.
- La conversión USD conserva el equivalente CRC y la tasa aplicada. El servicio
  de tasas consulta el cache y puede actualizarlo desde BCCR cuando está configurado.
- El worker local de correo usa Microsoft Graph para leer alertas, parsers por
  banco para extraer compras y reglas/Ollama para categorizarlas. Luego escribe
  movimientos y controla duplicados. Su activación real sigue pendiente según el
  último handoff; no se ejecutó contra el buzón ni la base remota en esta revisión.

## Validación de pagos del 2026-10-08

Comprobaciones ejecutadas nuevamente:

- Vitest: **403 pruebas, 68 archivos**, todos pasan.
- ESLint y TypeScript sin errores.
- Build de producción con `next build --webpack` exitoso.
- Migraciones `001` a `009` presentes en la base Supabase local.
- Chromium autenticado: creación de deuda y obligación, pago con importe variable,
  avance de fechas, historial Pagados, edición y recordatorio de tarjeta sin monto
  ni acción de pago.
- Edición de una obligación y configuración de deuda antigua en móvil. Configurar
  fecha preservó el importe y las cuotas pagadas de la deuda antigua.
- Pagos, dashboard, deudas, cuentas y movimientos comprobados a 375 px después
  de completar hidratación y transiciones del menú; sin desbordamiento horizontal.
- Dos clientes autenticados reales: otro usuario no pudo leer, editar ni pagar la
  obligación, ni crear una obligación con la categoría ajena.
- Dos solicitudes concurrentes del mismo vencimiento: una aceptada, una rechazada,
  una sola transacción en el historial.
- Conversión inválida y reintento de vencimiento anterior rechazados. La conversión
  inválida no creó movimiento ni avanzó la fecha.
- Ancla 31: `2028-01-31 → 2028-02-29 → 2028-03-31` en la función de pago real.
- Pago USD de importe variable usando solo una tasa ya guardada localmente:
  equivalente CRC y referencia a la tasa persistidos correctamente.
- La base rechazó eliminar un pago programado o cambiar su fecha de vencimiento
  en el historial.

Ejemplo comprobado desde la interfaz:

| Paso | Confirmado | Compromisos pendientes | Margen seguro |
|---|---:|---:|---:|
| Ingreso ₡1.000.000, cuota ₡100.000 y servicio estimado ₡30.000 | ₡1.000.000 | ₡130.000 | ₡870.000 |
| Servicio pagado por ₡25.000 | ₡975.000 | ₡100.000 | ₡875.000 |
| Cuota pagada | ₡875.000 | ₡0 | ₡875.000 |

Se usaron dos usuarios temporales y datos sintéticos; ambos usuarios y sus datos
se eliminaron al finalizar. No se reinició la base ni se modificaron datos reales.
El diagnóstico y capturas quedan temporalmente en `/tmp/finanzas-payment-check/`;
Playwright y la biblioteca de Chromium se prepararon fuera de las dependencias
del proyecto. No fue necesario cambiar el código de la aplicación.

## Pendientes

1. Consolidar los cambios locales preservados: scripts de desarrollo con Webpack,
   el plan de pagos y los artefactos de diseño; revisar antes de integrar/publicar.
2. Retomar la ingesta de correo desde el [handoff](superpowers/HANDOFF.md). Ese
   documento, actualizado el 2026-10-01, reporta una clave remota inválida y deja
   pendiente el primer ciclo real y el arranque automático. Su estado remoto
   requiere una nueva comprobación.
3. Elegir hosting y habilitar despliegue. Existe CI, pero el workflow de CD solo
   documenta que el despliegue está pendiente de esa decisión. No se consultó el
   resultado actual de GitHub Actions.
4. Definir una fase contable específica si se requiere saldo de estado de cuenta,
   liquidación de tarjetas, reversión de pagos programados o saldo bancario real.

No se enviaron notificaciones ni se realizaron pagos bancarios. El bloque actual
registra pagos realizados por el usuario y muestra vencimientos dentro de la app.
