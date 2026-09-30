# Modelo de dinero — Ledger único

## Principio

**Las transacciones (`transactions`) son la fuente de verdad** de lo que realmente entró o salió.

Deudas, fondos de ahorro e `income_config` son **planificación y proyección**. Cuando se materializa un evento (pagar cuota, aportar a un fondo), se crea o enlaza una transacción.

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

### Saldo proyectado (UI secundaria)

```
salario_configurado
  − gastos netos del mes (ledger)
  − cuotas de deudas activas aún sin tx de pago este mes
  − aportes planificados de fondos aún no realizados este mes
```

No se restan de nuevo las cuotas/aportes que ya tienen transacción enlazada.

## Enlaces

- `transactions.debt_id` → pago de cuota
- `transactions.savings_contribution_id` → aporte a fondo
- Marcar cuota pagada **crea** una tx de gasto
- Registrar aporte **crea** contribution + tx de ahorro + actualiza fondo

## Moneda

- Totales en **CRC**
- USD se convierte al registrar; idealmente con tasa del **día de la operación**
- Timezone de “mes actual”: `America/Costa_Rica`

## Qué no hacer

- No restar `debts.monthly_amount` y además el gasto de cuota en el mismo KPI
- No contar categorías `savings` como “gastos” en listados
- No actualizar `current_amount_crc` del fondo sin el aporte correspondiente
