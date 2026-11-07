# Modelo de dinero — Ledger único

## Principio

**Las transacciones (`transactions`) son la fuente de verdad** de lo que realmente entró o salió.

Deudas, obligaciones recurrentes, fondos de ahorro e `income_config` son **planificación y proyección**. Cuando se materializa un evento (pagar cuota, pagar servicio, aportar a un fondo), se crea o enlaza una transacción.

## KPIs

| KPI | Fórmula | Fuente |
|-----|---------|--------|
| **Ingresos** | Σ tx con categoría `income` | Ledger |
| **Gastos brutos** | Σ tx `fixed_expense` + `variable_expense` | Ledger |
| **Reembolsos** | Σ tx con `transaction_type = reimbursement` (monto CRC) | Ledger |
| **Gastos netos** | Gastos brutos − reembolsos | Ledger |
| **Ahorro** | Σ tx con categoría `savings` | Ledger |
| **Balance del mes** | Ingresos − gastos brutos − ahorro | Ledger |
| **Saldo disponible** | Igual al balance del mes (ledger). Si no hay ingresos registrados y sí hay `income_config`, se muestra además el **saldo proyectado**. | Ledger (+ plan) |

### Margen seguro y estimación del dashboard

```
confirmado = ingresos − gastos brutos − ahorro registrados del mes
compromisos = cuotas y obligaciones impagas con vencimiento en el mes
  + reserva mensual de deudas antiguas sin fecha, si no tienen pago en el mes
  + aportes planificados aún pendientes
margen_seguro = confirmado − compromisos
estimado = margen_seguro + max(ingreso_mensual_configurado − ingreso_registrado, 0)
```

No se restan de nuevo las cuotas/aportes que ya tienen transacción enlazada.
El estimado se muestra separado del dinero disponible; si no hay configuración
de ingreso, se solicita configurarla. Los recordatorios de tarjetas no tienen
monto y no forman parte de los compromisos monetarios.

## Enlaces

- `transactions.debt_id` → pago de cuota
- `transactions.recurring_obligation_id` → pago de obligación recurrente
- `transactions.scheduled_due_date` → vencimiento saldado de deuda/obligación
- `transactions.savings_contribution_id` → aporte a fondo
- Marcar cuota pagada **crea** una tx de gasto
- Registrar pago recurrente **crea** una tx por el importe real pagado
- Registrar aporte **crea** contribution + tx de ahorro + actualiza fondo

En pagos programados, crear el movimiento y avanzar la fecha se realiza en una
función de PostgreSQL dentro de una transacción. Se conserva el día ancla y solo
se avanza un periodo por pago. La identidad del pago no se puede cambiar ni el
movimiento eliminar desde el historial; la reversión requiere un flujo futuro.

## Moneda

- Totales en **CRC**
- USD se convierte al registrar; idealmente con tasa del **día de la operación**
- Timezone de “mes actual”: `America/Costa_Rica`

## Qué no hacer

- No restar `debts.monthly_amount` y además el gasto de cuota en el mismo KPI
- No contar categorías `savings` como “gastos” en listados
- No actualizar `current_amount_crc` del fondo sin el aporte correspondiente
