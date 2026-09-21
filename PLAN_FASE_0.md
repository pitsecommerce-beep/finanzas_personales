# Fase 0: Plan de rediseno del modelo financiero

## 1. Inventario del esquema actual

### Tablas existentes

| Tabla | Filas (estimado) | Proposito |
|---|---|---|
| `profiles` | 1 per user | Perfil del usuario |
| `cards` | N | Mezcla: credit, debit, cash, savings, voucher, investment |
| `transactions` | N | Gastos e ingresos, traspasos marcados con `is_transfer` |
| `fixed_expenses` | N | MSI y gastos fijos recurrentes |
| `income_sources` | N | Fuentes de ingreso recurrentes |
| `accounts` | N | Deudas con personas (receivable/payable) |
| `savings_goals` | N | Metas de ahorro |
| `ai_config` | 1 per user | Config del asesor IA |
| `shortcuts_tokens` | N | Tokens de Apple Shortcuts |

### Enums actuales

| Enum | Valores |
|---|---|
| `card_type` | credit, debit, cash, savings, voucher, investment |
| `transaction_type` | expense, income |
| `frequency_type` | weekly, biweekly, monthly |
| `fixed_expense_status` | active, completed, cancelled |
| `gender_type` | male, female, other, prefer_not_to_say |
| `account_type` | receivable, payable |

### Triggers, funciones, vistas

No existen. Cero triggers, cero funciones, cero vistas en la BD actual.

### RLS

Todas las tablas tienen RLS habilitado con politica unica `FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)` (rehechas en migracion 008). No hay FK compuesta para prevenir cross-user en relaciones.

### Indices

- `idx_cards_user(user_id)`
- `idx_transactions_user(user_id)`, `idx_transactions_user_date(user_id, date)`, `idx_transactions_card(card_id)`
- `idx_fixed_expenses_user(user_id)`, `idx_fixed_expenses_card(card_id)`
- `idx_income_sources_user(user_id)`
- `idx_accounts_user(user_id)`
- `idx_profiles_user(user_id)`
- `idx_shortcuts_tokens_token(token)`, `idx_shortcuts_tokens_user(user_id)`

---

## 2. Inventario de consultas Supabase en la app

### Consultas por tabla

**cards**
- SELECT: `use-cards.ts:19`, `use-transactions.ts:56`, `use-yields.ts:27`, `inicio/page.tsx:40`, `reportes/page.tsx:53`, `pyl/page.tsx:105`, `tarjetas/[id]/page.tsx:28`, `shortcuts/expense/route.ts:163`, `card-selector.tsx`, `transfer-form.tsx:40`
- INSERT: `use-cards.ts:42`
- UPDATE: `use-cards.ts:55`, `use-transactions.ts:70-86` (balance manual), `use-yields.ts:89` (balance + last_yield_date)
- DELETE: `use-cards.ts:71`

**transactions**
- SELECT: `use-transactions.ts:30`, `inicio/page.tsx:36`, `reportes/page.tsx:44-50`, `pyl/page.tsx:98`, `tarjetas/[id]/page.tsx:29`
- INSERT: `use-transactions.ts:109`, `use-yields.ts:73`, `shortcuts/expense/route.ts:190`
- UPDATE: `use-transactions.ts:171`
- DELETE: `use-transactions.ts:146`, `use-transactions.ts:158`

**fixed_expenses**
- SELECT: `use-fixed-expenses.ts:21`, `pyl/page.tsx:103`, `tarjetas/[id]/page.tsx:30`
- INSERT: `use-fixed-expenses.ts:43`
- UPDATE: `use-fixed-expenses.ts:78`
- DELETE: `use-fixed-expenses.ts:66`

**income_sources**
- SELECT: `use-income.ts:19`, `pyl/page.tsx:104`
- INSERT: `use-income.ts:43`
- UPDATE: `use-income.ts:67`
- DELETE: `use-income.ts:81`

**accounts** (deudas)
- SELECT: `use-accounts.ts:19`, `pyl/page.tsx:106`
- INSERT: `use-accounts.ts:49`
- UPDATE: `use-accounts.ts:65`
- DELETE: `use-accounts.ts:87`

**savings_goals**
- SELECT: `use-savings.ts:18`
- INSERT: `use-savings.ts:38`
- UPDATE: `use-savings.ts:56`
- DELETE: `use-savings.ts:68`

**shortcuts_tokens**
- SELECT: `shortcuts/expense/route.ts:125`, `shortcuts/token/route.ts`

**ai_config**
- SELECT/UPSERT: `configuracion/page.tsx`, `ai/chat/route.ts`

**profiles**
- SELECT/UPSERT: `use-profile.ts`

---

## 3. Problemas confirmados

### P-01: Saldos almacenados manualmente
`cards.balance` y `cards.used_credit` se escriben a mano en `use-transactions.ts:54-88`. Cuando se agrega un gasto, el hook llama a `updateCardBalance()` que lee el saldo actual y lo actualiza sumando/restando. Si dos operaciones corren en paralelo, el saldo queda mal. Ademas, no hay reconciliacion con la suma de movimientos.

### P-02: Traspasos contados como ingreso/gasto
En `transfer-form.tsx:66-80`, un traspaso se inserta como `type: 'expense'` con `is_transfer: true`. Aunque las pantallas filtran `!t.is_transfer`, el filtro no es universal: `spending-chart.tsx:20` filtra `t.type === 'expense'` sin excluir traspasos, y cualquier consulta futura sin ese filtro los contaria.

### P-03: Una sola fila para el traspaso
El traspaso actual es UNA sola fila en `transactions` con `transfer_from_card_id` y `transfer_to_card_id`. Esto impide derivar el saldo de cada cuenta por la suma de sus movimientos (la fila no tiene `account_id` unico).

### P-04: Rendimientos calculados en el cliente
`use-yields.ts` corre en el browser al cargar la pagina. Si el usuario no abre la app, no se generan rendimientos. Se registran como `type: 'income'`, inflando los ingresos. No hay idempotencia: solo depende de `last_yield_date` que se actualiza en la misma operacion.

### P-05: Bug PATCH 400 al editar tarjeta
El `card-form.tsx` construye `cardData` y envia todos los campos. Cuando `cardType` cambia de valor, los campos condicionales envian `null` para campos que tienen CHECKs (por ejemplo, `cut_off_day: null` viola el CHECK `BETWEEN 1 AND 31` de la migracion 001, aunque la migracion 002 hizo `DROP NOT NULL`). El CHECK sigue activo. Ademas, enviar `last_four_digits: ''` viola el CHECK `length(last_four_digits) = 4`.

### P-06: Tipos numericos insuficientes
Todo es `NUMERIC(12,2)`. El documento pide `NUMERIC(16,4)`.

### P-07: No existe modelo de cortes de tarjeta
No hay tabla `card_statements`. El "pago por venir" se calcula como `card.used_credit` directo, sin periodos de corte ni fechas limite calculadas.

### P-08: Sin borrado logico
Las transacciones se borran fisicamente (`DELETE`). El documento exige borrado logico con `deleted_at`.

### P-09: Categorias como texto libre
`transactions.category` es `TEXT`. No hay tabla catalogo. La migracion necesita deduplicar los valores existentes.

### P-10: Sin idempotencia
No hay `idempotency_key` en transacciones. Shortcuts puede duplicar gastos si la peticion se reenvia.

---

## 4. Mapeo campo por campo: esquema viejo a nuevo

### `cards` -> `accounts` (nueva)

| Campo viejo (`cards`) | Campo nuevo (`accounts`) | Notas |
|---|---|---|
| `id` | `id` | Se mantiene UUID |
| `user_id` | `user_id` | FK a auth.users |
| `bank_name` | `institution` | Renombrado |
| `alias` | `alias` | Se mantiene |
| `card_type` | `account_type` | Mapeo: credit->credit_card, debit->debit, cash->cash, savings->savings, voucher->voucher, investment->investment |
| `last_four_digits` | `last_four` | Renombrado, mismo CHECK |
| `cut_off_day` | `cut_off_day` | Solo para credit_card, CHECK por tipo |
| `payment_day` | `payment_day` | Solo para credit_card |
| `credit_limit` | `credit_limit` | Solo para credit_card, NUMERIC(16,4) |
| `balance` | NO SE MIGRA como campo. Se genera un `ledger_entry` de tipo `adjustment` con `source='system'` | P1: saldo derivado |
| `used_credit` | NO SE MIGRA como campo. Se genera un `ledger_entry` de tipo `adjustment` negativo | P1: derivado |
| `has_yields` | `yields_enabled` | Renombrado |
| `yield_rate` | Se mueve a `account_yield_tiers.annual_rate` (min_balance=0) | |
| `yield_rate_above_limit` | Se mueve a `account_yield_tiers.annual_rate` (min_balance=25000) | |
| `yield_frequency` | `yield_compounding` | Mapeo: daily->daily, monthly->monthly |
| `money_availability` | `liquidity` | Mapeo: immediate->immediate, 24h->t_plus_1, 48h->t_plus_2, 28_days/custom->locked |
| `last_yield_date` | `last_yield_applied_on` | Renombrado |
| `color` | `color` | Se mantiene |
| `investment_platform` | `institution` (se reutiliza) | |
| `investment_ticker` | Se elimina. Las inversiones se modelaran como cuenta con balance por movimientos | Simplificacion: el ticker/shares/precio no son datos contables del libro |
| `investment_shares` | Se eliminan campos de inversion por ahora | Se documenta en migration_review |
| `investment_buy_price` | Idem | |
| `investment_buy_date` | Idem | |
| `created_at` | `created_at` | |
| `updated_at` | `updated_at` | |
| (nuevo) | `opening_balance` | NUMERIC(16,4) DEFAULT 0 |
| (nuevo) | `opening_date` | DATE NOT NULL, sera fecha de migracion |
| (nuevo) | `name` | Copiado de `alias` |
| (nuevo) | `currency` | DEFAULT 'MXN' |
| (nuevo) | `is_active` | DEFAULT true |
| (nuevo) | `archived_at` | NULL |
| (nuevo) | `notes` | NULL |
| (nuevo) | `interest_rate_annual` | Solo credit_card, de la tarjeta si existe |
| (nuevo) | `expires_on` | Solo voucher |
| (nuevo) | `allowed_categories` | Solo voucher |
| (nuevo) | `is_transferable` | Solo voucher, default false |
| (nuevo) | `locked_until` | Solo investment |
| (nuevo) | `isr_withholding_rate` | Default 0.00145 (ISR vigente) |

### `accounts` (actual, deudas) -> `debts`

| Campo viejo | Campo nuevo (`debts`) | Notas |
|---|---|---|
| `id` | `id` | |
| `user_id` | `user_id` | |
| `type` | `type` | receivable/payable, se mantiene |
| `person_name` | `person_name` | |
| `description` | `description` | |
| `amount` | `amount` | NUMERIC(16,4) |
| `due_date` | `due_date` | |
| `is_paid` | `is_paid` | |
| `created_at` | `created_at` | |

### `transactions` -> `ledger_entries`

| Campo viejo | Campo nuevo | Notas |
|---|---|---|
| `id` | `id` | |
| `user_id` | `user_id` | |
| `card_id` | `account_id` | FK a accounts.id |
| `amount` | `amount` | Conversion de signo: expense mantiene valor pero se guarda negativo. income se guarda positivo |
| `description` | `description` | |
| `category` | `category_id` | FK a nueva tabla `categories` |
| `type` | `entry_type` | Mapeo: expense->expense, income->income. Si is_transfer=true: transfer |
| `date` | `occurred_on` | Se mantiene |
| (nuevo) | `occurred_at` | Se genera como `date::timestamptz AT TIME ZONE 'America/Mexico_City'` |
| `is_recurring` | Se elimina. Sera parte de `recurring_rules` | |
| `installment_months` | Se mueve a `installment_plans` | |
| `installment_current` | Se elimina, se deriva | |
| `notes` | `notes` | |
| `is_transfer` | Se elimina. Determinado por `entry_type = 'transfer'` | |
| `transfer_from_card_id` | Se elimina. Se genera par de filas con `transfer_group_id` | |
| `transfer_to_card_id` | Se elimina. Idem | |
| `currency` | `currency` | |
| `exchange_rate` | `fx_rate` | |
| (nuevo) | `amount_original` | Monto en moneda original |
| (nuevo) | `amount_base` | Monto en MXN |
| (nuevo) | `transfer_group_id` | UUID, solo para transfers |
| (nuevo) | `source` | app/shortcuts/recurring/system/import |
| (nuevo) | `idempotency_key` | Para dedup de shortcuts |
| (nuevo) | `deleted_at` | Borrado logico |
| (nuevo) | `counterparty` | Texto libre |
| (nuevo) | `installment_plan_id` | FK a installment_plans |
| (nuevo) | `statement_id` | FK a card_statements |
| `created_at` | `created_at` | |

### Convencion de signo para la migracion

- `transactions` con `type='expense'`: `amount` actual es positivo. En `ledger_entries` se convierte a negativo.
- `transactions` con `type='income'`: `amount` actual es positivo. En `ledger_entries` se mantiene positivo.
- Traspasos (`is_transfer=true`): se generan DOS filas. Fila 1 (cuenta origen `transfer_from_card_id`): amount negativo. Fila 2 (cuenta destino `transfer_to_card_id`): amount positivo.

---

## 5. Tablas nuevas a crear

1. **`accounts`** (cuentas financieras) - descrita arriba
2. **`debts`** (renombrado de `accounts` actual)
3. **`ledger_entries`** (reemplaza `transactions`)
4. **`categories`** (catalogo de categorias)
5. **`card_statements`** (cortes de tarjeta de credito)
6. **`installment_plans`** (MSI, reemplaza `fixed_expenses` para MSI)
7. **`recurring_rules`** (reglas de recurrencia, absorbe parte de `income_sources` y `fixed_expenses` no-MSI)
8. **`account_yield_tiers`** (escalones de tasa de rendimiento)
9. **`migration_review`** (filas ambiguas de la migracion)

---

## 6. Decisiones tomadas y ambiguedades

### D-01: Campos de inversion (ticker, shares, precio)
**Decision:** Se eliminan de `accounts`. No son datos contables. Una inversion se modela como cuenta tipo `investment` con `opening_balance` y movimientos de tipo `adjustment`/`yield`. Los metadatos del instrumento (ticker, plataforma, etc.) se pueden agregar despues como extension. Los valores actuales se documentan en `migration_review` para referencia.

### D-02: `fixed_expenses` vs `installment_plans`
**Decision:** Los registros con `is_msi = true` migran a `installment_plans`. Los registros con `is_msi = false` migran a `recurring_rules`. La tabla `fixed_expenses` se renombra a `fixed_expenses_legacy`.

### D-03: `income_sources` 
**Decision:** Migran a `recurring_rules` con `entry_type = 'income'`. La tabla se renombra a `income_sources_legacy`.

### D-04: `savings_goals`
**Decision:** Se mantiene como tabla separada por ahora. No tiene conflicto con el nuevo modelo. Los traspasos a metas de ahorro se modelan como transfers entre cuentas.

### D-05: Saldos iniciales
**Decision tomada en el documento:** `opening_balance = 0`, `opening_date = fecha de migracion`. Se genera un `ledger_entry` de ajuste por cuenta con el saldo declarado actual.

### D-06: Traspasos incompletos
**Decision:** Si un traspaso tiene `transfer_from_card_id` pero no `transfer_to_card_id` (o viceversa), se marca en `migration_review`. No se inventa la contraparte.

### D-07: Categorias duplicadas
**Decision:** Se crea tabla `categories` con los valores unicos existentes en `transactions.category`. Las variantes se deduplicaran en la migracion (ej: 'Comida' y 'comida' se unifican).

### D-08: `spending-chart.tsx` incluye traspasos en gastos
**Confirmado en la linea 20:** filtra `t.type === 'expense'` sin excluir `is_transfer`. Esto es el bug T7. Se corrige filtrando por `entry_type IN ('income','expense')` en el nuevo modelo.

---

## 7. Orden de ejecucion propuesto

### Paso 1: Migracion SQL (un solo archivo)
1. Crear nuevos enums (`account_type_v2`, `entry_type`, `entry_source`, `liquidity_type`, `yield_compounding_type`)
2. Renombrar `accounts` -> `debts`
3. Crear `categories` y poblar desde valores existentes
4. Crear `accounts` (nueva)
5. Crear `account_yield_tiers`
6. Crear `ledger_entries`
7. Crear `card_statements`
8. Crear `installment_plans`
9. Crear `recurring_rules`
10. Crear `migration_review`
11. Backfill: `cards` -> `accounts`
12. Backfill: generar `ledger_entry` de ajuste inicial por cuenta
13. Backfill: `transactions` -> `ledger_entries` (con conversion de signo)
14. Backfill: traspasos a pares de filas
15. Backfill: `fixed_expenses` (is_msi) -> `installment_plans`
16. Backfill: `fixed_expenses` (!is_msi) + `income_sources` -> `recurring_rules`
17. Crear indices
18. Crear vistas: `v_account_balances`, `v_net_worth`, `v_liquid_available`, `v_cashflow_monthly`, `v_upcoming_payments`
19. Crear funciones: `fn_transfer`, `fn_adjust_balance`
20. Crear triggers: validacion de transfer_group, updated_at
21. Crear RLS en todas las tablas nuevas
22. Renombrar tablas viejas con sufijo `_legacy`
23. Consultas de verificacion

### Paso 2: Adaptar la app
1. Crear capa de acceso a datos (`src/lib/data/`)
2. Actualizar tipos TypeScript
3. Migrar hooks a usar la capa de datos
4. Actualizar componentes
5. Corregir calculo de totales (filtrar por entry_type)
6. Actualizar API de Shortcuts
7. Mover rendimientos a funcion de BD

---

## 8. Verificaciones post-migracion (M4)

```sql
-- Saldo por cuenta: suma de ledger_entries vs balance declarado
-- Ingresos/gastos por mes antes y despues
-- Conteo de filas migradas vs origen
-- Grupos de traspaso que no sumen cero
-- Filas en migration_review
```

Estas consultas se incluiran al final de la migracion.

---

**Este plan requiere aprobacion antes de ejecutar cualquier codigo.**
