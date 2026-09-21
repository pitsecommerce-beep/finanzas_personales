-- ============================================================
-- Migration 012: Financial Model v2
-- Refactors the schema per REFACTOR_MODELO_FINANCIERO.md
-- ============================================================

BEGIN;

-- ──────────────────────────────────────────────────────────────
-- 1. New enums
-- ──────────────────────────────────────────────────────────────

CREATE TYPE account_type_v2 AS ENUM (
  'credit_card', 'debit', 'cash', 'savings', 'voucher', 'investment'
);

CREATE TYPE entry_type AS ENUM (
  'expense', 'income', 'transfer', 'adjustment', 'yield'
);

CREATE TYPE entry_source AS ENUM (
  'app', 'shortcuts', 'recurring', 'system', 'import'
);

CREATE TYPE liquidity_type AS ENUM (
  'immediate', 't_plus_1', 't_plus_2', 'locked'
);

CREATE TYPE yield_compounding_type AS ENUM (
  'daily', 'monthly', 'quarterly', 'annual'
);

-- ──────────────────────────────────────────────────────────────
-- 2. Rename current accounts (debts) -> debts
-- ──────────────────────────────────────────────────────────────

ALTER TABLE accounts RENAME TO debts;
ALTER INDEX idx_accounts_user RENAME TO idx_debts_user;

ALTER TABLE debts ALTER COLUMN amount TYPE NUMERIC(16,4);

-- ──────────────────────────────────────────────────────────────
-- 3. Create categories table and seed from existing data
-- ──────────────────────────────────────────────────────────────

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '📦',
  applies_to TEXT NOT NULL DEFAULT 'both'
    CHECK (applies_to IN ('expense', 'income', 'both', 'transfer', 'system')),
  sort_order INTEGER NOT NULL DEFAULT 100,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO categories (slug, label, emoji, applies_to, sort_order, is_system) VALUES
  ('restaurante',     'Restaurante',     '🍽️', 'expense', 1,  false),
  ('transporte',      'Transporte',      '🚗', 'expense', 2,  false),
  ('despensa',        'Despensa',        '🛒', 'expense', 3,  false),
  ('entretenimiento', 'Entretenimiento', '🎬', 'expense', 4,  false),
  ('salud',           'Salud',           '💊', 'expense', 5,  false),
  ('educacion',       'Educación',       '📚', 'expense', 6,  false),
  ('servicios',       'Servicios',       '💡', 'expense', 7,  false),
  ('ropa',            'Ropa',            '👕', 'expense', 8,  false),
  ('hogar',           'Hogar',           '🏠', 'expense', 9,  false),
  ('mascotas',        'Mascotas',        '🐾', 'expense', 10, false),
  ('viajes',          'Viajes',          '✈️', 'expense', 11, false),
  ('regalos',         'Regalos',         '🎁', 'expense', 12, false),
  ('suscripciones',   'Suscripciones',   '📱', 'expense', 13, false),
  ('cafe',            'Café',            '☕', 'expense', 14, false),
  ('gimnasio',        'Gimnasio',        '💪', 'expense', 15, false),
  ('otros',           'Otros',           '📦', 'both',    99, false),
  ('traspaso',        'Traspaso',        '🔄', 'transfer', 50, true),
  ('pago_credito',    'Pago a tarjeta',  '💳', 'transfer', 51, true),
  ('nomina',          'Nómina',          '💼', 'income',  1,  false),
  ('freelance',       'Freelance',       '💻', 'income',  2,  false),
  ('negocio',         'Negocio',         '🏢', 'income',  3,  false),
  ('inversiones',     'Inversiones',     '📈', 'income',  4,  false),
  ('rendimientos',    'Rendimientos',    '🏦', 'income',  5,  true),
  ('renta',           'Renta',           '🏘️', 'income',  6,  false),
  ('venta',           'Venta',           '🏷️', 'income',  7,  false),
  ('ajuste',          'Ajuste',          '⚙️', 'system',  90, true);

-- Insert any user categories not in the seed
INSERT INTO categories (slug, label, emoji, applies_to, sort_order)
SELECT DISTINCT
  LOWER(TRIM(t.category)),
  INITCAP(TRIM(t.category)),
  '📦',
  'both',
  100
FROM transactions t
WHERE LOWER(TRIM(t.category)) NOT IN (SELECT slug FROM categories)
  AND t.category IS NOT NULL
  AND TRIM(t.category) <> ''
ON CONFLICT (slug) DO NOTHING;

-- ──────────────────────────────────────────────────────────────
-- 4. Create accounts table (financial accounts)
-- ──────────────────────────────────────────────────────────────

CREATE TABLE accounts_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_type account_type_v2 NOT NULL,
  institution TEXT,
  alias TEXT NOT NULL,
  name TEXT NOT NULL,
  last_four TEXT CHECK (last_four IS NULL OR length(last_four) = 4),
  color TEXT NOT NULL DEFAULT '#14B8A6',
  currency TEXT NOT NULL DEFAULT 'MXN',
  is_active BOOLEAN NOT NULL DEFAULT true,
  archived_at TIMESTAMPTZ,
  notes TEXT,

  -- Credit card fields
  cut_off_day INTEGER CHECK (cut_off_day IS NULL OR cut_off_day BETWEEN 1 AND 31),
  payment_day INTEGER CHECK (payment_day IS NULL OR payment_day BETWEEN 1 AND 31),
  credit_limit NUMERIC(16,4),
  interest_rate_annual NUMERIC(6,3),

  -- Balance derivation
  opening_balance NUMERIC(16,4) NOT NULL DEFAULT 0,
  opening_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Yield fields
  yields_enabled BOOLEAN NOT NULL DEFAULT false,
  yield_compounding yield_compounding_type,
  liquidity liquidity_type DEFAULT 'immediate',
  last_yield_applied_on DATE,
  isr_withholding_rate NUMERIC(8,6) NOT NULL DEFAULT 0.00145,

  -- Voucher fields
  expires_on DATE,
  allowed_categories TEXT,
  is_transferable BOOLEAN NOT NULL DEFAULT false,

  -- Investment fields
  locked_until DATE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────────────────────
-- 5. Create account_yield_tiers
-- ──────────────────────────────────────────────────────────────

CREATE TABLE account_yield_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts_v2(id) ON DELETE CASCADE,
  min_balance NUMERIC(16,4) NOT NULL DEFAULT 0,
  annual_rate NUMERIC(8,5) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────────────────────
-- 6. Create ledger_entries
-- ──────────────────────────────────────────────────────────────

CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts_v2(id) ON DELETE SET NULL,
  entry_type entry_type NOT NULL,
  amount NUMERIC(16,4) NOT NULL,
  amount_original NUMERIC(16,4),
  amount_base NUMERIC(16,4),
  currency TEXT NOT NULL DEFAULT 'MXN',
  fx_rate NUMERIC(10,4),
  description TEXT NOT NULL,
  category_id UUID REFERENCES categories(id),
  occurred_on DATE NOT NULL DEFAULT CURRENT_DATE,
  occurred_at TIMESTAMPTZ,
  notes TEXT,
  source entry_source NOT NULL DEFAULT 'app',
  counterparty TEXT,
  idempotency_key TEXT UNIQUE,
  transfer_group_id UUID,
  installment_plan_id UUID,
  statement_id UUID,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────────────────────
-- 7. Create card_statements
-- ──────────────────────────────────────────────────────────────

CREATE TABLE card_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts_v2(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  payment_due_date DATE NOT NULL,
  total_amount NUMERIC(16,4),
  minimum_payment NUMERIC(16,4),
  no_interest_payment NUMERIC(16,4),
  is_paid BOOLEAN NOT NULL DEFAULT false,
  paid_amount NUMERIC(16,4),
  paid_on DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────────────────────
-- 8. Create installment_plans
-- ──────────────────────────────────────────────────────────────

CREATE TABLE installment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts_v2(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  total_amount NUMERIC(16,4) NOT NULL,
  monthly_amount NUMERIC(16,4) NOT NULL,
  total_months INTEGER NOT NULL,
  remaining_months INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  category_id UUID REFERENCES categories(id),
  currency TEXT NOT NULL DEFAULT 'MXN',
  fx_rate NUMERIC(10,4),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────────────────────
-- 9. Create recurring_rules
-- ──────────────────────────────────────────────────────────────

CREATE TABLE recurring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts_v2(id) ON DELETE SET NULL,
  entry_type entry_type NOT NULL CHECK (entry_type IN ('expense', 'income')),
  description TEXT NOT NULL,
  amount NUMERIC(16,4) NOT NULL,
  frequency frequency_type NOT NULL DEFAULT 'monthly',
  category_id UUID REFERENCES categories(id),
  next_occurrence DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  currency TEXT NOT NULL DEFAULT 'MXN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────────────────────
-- 10. Create migration_review
-- ──────────────────────────────────────────────────────────────

CREATE TABLE migration_review (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table TEXT NOT NULL,
  source_id UUID NOT NULL,
  reason TEXT NOT NULL,
  data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────────────────────
-- 11. Backfill: cards -> accounts_v2
-- ──────────────────────────────────────────────────────────────

INSERT INTO accounts_v2 (
  id, user_id, account_type, institution, alias, name, last_four, color,
  currency, is_active,
  cut_off_day, payment_day, credit_limit,
  opening_balance, opening_date,
  yields_enabled, yield_compounding, liquidity, last_yield_applied_on,
  created_at, updated_at
)
SELECT
  c.id,
  c.user_id,
  CASE c.card_type
    WHEN 'credit' THEN 'credit_card'::account_type_v2
    WHEN 'debit' THEN 'debit'::account_type_v2
    WHEN 'cash' THEN 'cash'::account_type_v2
    WHEN 'savings' THEN 'savings'::account_type_v2
    WHEN 'voucher' THEN 'voucher'::account_type_v2
    WHEN 'investment' THEN 'investment'::account_type_v2
  END,
  c.bank_name,
  c.alias,
  c.alias,
  CASE WHEN length(c.last_four_digits) = 4 THEN c.last_four_digits ELSE NULL END,
  c.color,
  'MXN',
  true,
  CASE WHEN c.card_type = 'credit' THEN c.cut_off_day ELSE NULL END,
  CASE WHEN c.card_type = 'credit' THEN c.payment_day ELSE NULL END,
  CASE WHEN c.card_type = 'credit' THEN c.credit_limit ELSE NULL END,
  0,
  CURRENT_DATE,
  COALESCE(c.has_yields, false),
  CASE
    WHEN c.yield_frequency = 'daily' THEN 'daily'::yield_compounding_type
    WHEN c.yield_frequency = 'monthly' THEN 'monthly'::yield_compounding_type
    WHEN c.yield_frequency = 'quarterly' THEN 'quarterly'::yield_compounding_type
    WHEN c.yield_frequency = 'annual' THEN 'annual'::yield_compounding_type
    ELSE NULL
  END,
  CASE
    WHEN c.money_availability = 'immediate' THEN 'immediate'::liquidity_type
    WHEN c.money_availability = '24h' THEN 't_plus_1'::liquidity_type
    WHEN c.money_availability = '48h' THEN 't_plus_2'::liquidity_type
    WHEN c.money_availability IN ('28_days', 'custom') THEN 'locked'::liquidity_type
    ELSE 'immediate'::liquidity_type
  END,
  c.last_yield_date,
  c.created_at,
  c.updated_at
FROM cards c;

-- Backfill yield tiers
INSERT INTO account_yield_tiers (account_id, min_balance, annual_rate)
SELECT c.id, 0, c.yield_rate
FROM cards c
WHERE c.has_yields = true AND c.yield_rate IS NOT NULL;

INSERT INTO account_yield_tiers (account_id, min_balance, annual_rate)
SELECT c.id, 25000, c.yield_rate_above_limit
FROM cards c
WHERE c.has_yields = true AND c.yield_rate_above_limit IS NOT NULL;

-- Log investment metadata to migration_review
INSERT INTO migration_review (source_table, source_id, reason, data)
SELECT
  'cards', c.id, 'investment_metadata_not_migrated',
  jsonb_build_object(
    'investment_platform', c.investment_platform,
    'investment_ticker', c.investment_ticker,
    'investment_shares', c.investment_shares,
    'investment_buy_price', c.investment_buy_price,
    'investment_buy_date', c.investment_buy_date
  )
FROM cards c
WHERE c.card_type = 'investment'
  AND (c.investment_ticker IS NOT NULL OR c.investment_shares IS NOT NULL);

-- ──────────────────────────────────────────────────────────────
-- 12. Backfill: initial balance adjustments
-- ──────────────────────────────────────────────────────────────

-- For debit/cash/savings/voucher/investment: balance becomes opening adjustment
INSERT INTO ledger_entries (
  user_id, account_id, entry_type, amount, description,
  category_id, occurred_on, source, notes
)
SELECT
  c.user_id,
  c.id,
  'adjustment'::entry_type,
  COALESCE(c.balance, 0),
  'Saldo inicial (migración)',
  (SELECT id FROM categories WHERE slug = 'ajuste'),
  CURRENT_DATE,
  'system'::entry_source,
  'Ajuste automático de migración v2'
FROM cards c
WHERE c.card_type IN ('debit', 'cash', 'savings', 'voucher', 'investment')
  AND COALESCE(c.balance, 0) <> 0;

-- For credit cards: used_credit becomes negative adjustment
INSERT INTO ledger_entries (
  user_id, account_id, entry_type, amount, description,
  category_id, occurred_on, source, notes
)
SELECT
  c.user_id,
  c.id,
  'adjustment'::entry_type,
  -COALESCE(c.used_credit, 0),
  'Saldo usado crédito (migración)',
  (SELECT id FROM categories WHERE slug = 'ajuste'),
  CURRENT_DATE,
  'system'::entry_source,
  'Crédito usado migrado como ajuste negativo'
FROM cards c
WHERE c.card_type = 'credit'
  AND COALESCE(c.used_credit, 0) <> 0;

-- ──────────────────────────────────────────────────────────────
-- 13. Backfill: transactions -> ledger_entries (non-transfers)
-- ──────────────────────────────────────────────────────────────

INSERT INTO ledger_entries (
  id, user_id, account_id, entry_type, amount,
  amount_original, amount_base, currency, fx_rate,
  description, category_id, occurred_on, occurred_at,
  notes, source, created_at
)
SELECT
  t.id,
  t.user_id,
  t.card_id,
  CASE t.type
    WHEN 'expense' THEN 'expense'::entry_type
    WHEN 'income' THEN 'income'::entry_type
  END,
  CASE t.type
    WHEN 'expense' THEN -ABS(t.amount)
    WHEN 'income' THEN ABS(t.amount)
  END,
  CASE WHEN t.currency = 'USD' AND t.exchange_rate IS NOT NULL
    THEN t.amount / t.exchange_rate
    ELSE t.amount
  END,
  CASE WHEN t.currency = 'USD' AND t.exchange_rate IS NOT NULL
    THEN t.amount
    ELSE NULL
  END,
  COALESCE(t.currency, 'MXN'),
  t.exchange_rate,
  t.description,
  cat.id,
  t.date,
  (t.date::text || 'T12:00:00-06:00')::timestamptz,
  t.notes,
  'app'::entry_source,
  t.created_at
FROM transactions t
LEFT JOIN categories cat ON cat.slug = LOWER(TRIM(t.category))
WHERE t.is_transfer = false;

-- ──────────────────────────────────────────────────────────────
-- 14. Backfill: transfers -> pairs of ledger_entries
-- ──────────────────────────────────────────────────────────────

-- Source side (debit from origin)
INSERT INTO ledger_entries (
  user_id, account_id, entry_type, amount,
  currency, description, category_id, occurred_on, occurred_at,
  notes, source, transfer_group_id, created_at
)
SELECT
  t.user_id,
  t.transfer_from_card_id,
  'transfer'::entry_type,
  -ABS(t.amount),
  COALESCE(t.currency, 'MXN'),
  t.description,
  (SELECT id FROM categories WHERE slug = CASE
    WHEN t.category = 'pago_credito' THEN 'pago_credito' ELSE 'traspaso'
  END),
  t.date,
  (t.date::text || 'T12:00:00-06:00')::timestamptz,
  t.notes,
  'app'::entry_source,
  t.id,
  t.created_at
FROM transactions t
WHERE t.is_transfer = true
  AND t.transfer_from_card_id IS NOT NULL;

-- Destination side (credit to destination)
INSERT INTO ledger_entries (
  user_id, account_id, entry_type, amount,
  currency, description, category_id, occurred_on, occurred_at,
  notes, source, transfer_group_id, created_at
)
SELECT
  t.user_id,
  t.transfer_to_card_id,
  'transfer'::entry_type,
  ABS(t.amount),
  COALESCE(t.currency, 'MXN'),
  t.description,
  (SELECT id FROM categories WHERE slug = CASE
    WHEN t.category = 'pago_credito' THEN 'pago_credito' ELSE 'traspaso'
  END),
  t.date,
  (t.date::text || 'T12:00:00-06:00')::timestamptz,
  t.notes,
  'app'::entry_source,
  t.id,
  t.created_at
FROM transactions t
WHERE t.is_transfer = true
  AND t.transfer_to_card_id IS NOT NULL;

-- Log incomplete transfers
INSERT INTO migration_review (source_table, source_id, reason, data)
SELECT 'transactions', t.id, 'incomplete_transfer',
  jsonb_build_object(
    'transfer_from_card_id', t.transfer_from_card_id,
    'transfer_to_card_id', t.transfer_to_card_id,
    'amount', t.amount
  )
FROM transactions t
WHERE t.is_transfer = true
  AND (t.transfer_from_card_id IS NULL OR t.transfer_to_card_id IS NULL);

-- ──────────────────────────────────────────────────────────────
-- 15. Backfill: fixed_expenses (MSI) -> installment_plans
-- ──────────────────────────────────────────────────────────────

INSERT INTO installment_plans (
  id, user_id, account_id, description, total_amount, monthly_amount,
  total_months, remaining_months, start_date, end_date,
  category_id, currency, fx_rate, is_active
)
SELECT
  fe.id,
  fe.user_id,
  fe.card_id,
  fe.description,
  fe.total_amount,
  fe.monthly_amount,
  fe.total_months,
  GREATEST(0, fe.total_months - EXTRACT(MONTH FROM age(CURRENT_DATE, fe.start_date))::int),
  fe.start_date,
  fe.end_date,
  cat.id,
  COALESCE(fe.currency, 'MXN'),
  fe.exchange_rate,
  fe.status = 'active'
FROM fixed_expenses fe
LEFT JOIN categories cat ON cat.slug = LOWER(TRIM(fe.category))
WHERE fe.is_msi = true;

-- ──────────────────────────────────────────────────────────────
-- 16. Backfill: fixed_expenses (!MSI) + income_sources -> recurring_rules
-- ──────────────────────────────────────────────────────────────

INSERT INTO recurring_rules (
  user_id, account_id, entry_type, description, amount,
  frequency, category_id, next_occurrence, is_active, currency
)
SELECT
  fe.user_id,
  fe.card_id,
  'expense'::entry_type,
  fe.description,
  fe.monthly_amount,
  'monthly'::frequency_type,
  cat.id,
  CASE
    WHEN fe.end_date IS NOT NULL AND fe.end_date < CURRENT_DATE THEN NULL
    ELSE CURRENT_DATE
  END,
  fe.status = 'active',
  COALESCE(fe.currency, 'MXN')
FROM fixed_expenses fe
LEFT JOIN categories cat ON cat.slug = LOWER(TRIM(fe.category))
WHERE fe.is_msi = false;

INSERT INTO recurring_rules (
  user_id, account_id, entry_type, description, amount,
  frequency, category_id, next_occurrence, is_active, currency
)
SELECT
  isrc.user_id,
  isrc.card_id,
  'income'::entry_type,
  isrc.description,
  isrc.amount,
  isrc.frequency,
  cat.id,
  isrc.next_payment_date,
  true,
  'MXN'
FROM income_sources isrc
LEFT JOIN categories cat ON cat.slug = LOWER(TRIM(COALESCE(isrc.income_type, 'otros')));

-- ──────────────────────────────────────────────────────────────
-- 17. Indexes
-- ──────────────────────────────────────────────────────────────

CREATE INDEX idx_accounts_v2_user ON accounts_v2(user_id);
CREATE INDEX idx_accounts_v2_type ON accounts_v2(account_type);

CREATE INDEX idx_ledger_user ON ledger_entries(user_id);
CREATE INDEX idx_ledger_account ON ledger_entries(account_id);
CREATE INDEX idx_ledger_user_date ON ledger_entries(user_id, occurred_on);
CREATE INDEX idx_ledger_type ON ledger_entries(entry_type);
CREATE INDEX idx_ledger_transfer_group ON ledger_entries(transfer_group_id)
  WHERE transfer_group_id IS NOT NULL;
CREATE INDEX idx_ledger_not_deleted ON ledger_entries(user_id, occurred_on)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_ledger_idempotency ON ledger_entries(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX idx_card_statements_account ON card_statements(account_id);
CREATE INDEX idx_installment_plans_user ON installment_plans(user_id);
CREATE INDEX idx_installment_plans_account ON installment_plans(account_id);
CREATE INDEX idx_recurring_rules_user ON recurring_rules(user_id);
CREATE INDEX idx_yield_tiers_account ON account_yield_tiers(account_id);
CREATE INDEX idx_categories_slug ON categories(slug);

-- ──────────────────────────────────────────────────────────────
-- 18. Views
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_account_balances AS
SELECT
  a.id AS account_id,
  a.user_id,
  a.alias,
  a.account_type,
  a.opening_balance,
  COALESCE(SUM(le.amount) FILTER (WHERE le.deleted_at IS NULL), 0) AS movements_sum,
  a.opening_balance + COALESCE(SUM(le.amount) FILTER (WHERE le.deleted_at IS NULL), 0) AS current_balance
FROM accounts_v2 a
LEFT JOIN ledger_entries le ON le.account_id = a.id
GROUP BY a.id, a.user_id, a.alias, a.account_type, a.opening_balance;

CREATE OR REPLACE VIEW v_net_worth AS
SELECT
  b.user_id,
  SUM(CASE
    WHEN a.account_type = 'credit_card' THEN -b.current_balance
    ELSE b.current_balance
  END) AS net_worth
FROM v_account_balances b
JOIN accounts_v2 a ON a.id = b.account_id
WHERE a.is_active = true
GROUP BY b.user_id;

CREATE OR REPLACE VIEW v_liquid_available AS
SELECT
  b.user_id,
  SUM(b.current_balance) AS liquid_total
FROM v_account_balances b
JOIN accounts_v2 a ON a.id = b.account_id
WHERE a.is_active = true
  AND a.account_type IN ('debit', 'cash', 'savings', 'voucher')
GROUP BY b.user_id;

CREATE OR REPLACE VIEW v_cashflow_monthly AS
SELECT
  le.user_id,
  DATE_TRUNC('month', le.occurred_on) AS month,
  SUM(le.amount) FILTER (WHERE le.entry_type = 'income') AS total_income,
  SUM(ABS(le.amount)) FILTER (WHERE le.entry_type = 'expense') AS total_expense,
  SUM(le.amount) FILTER (WHERE le.entry_type IN ('income', 'expense')) AS net
FROM ledger_entries le
WHERE le.deleted_at IS NULL
  AND le.entry_type IN ('income', 'expense')
GROUP BY le.user_id, DATE_TRUNC('month', le.occurred_on);

-- ──────────────────────────────────────────────────────────────
-- 19. Functions
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_transfer(
  p_user_id UUID,
  p_from_account_id UUID,
  p_to_account_id UUID,
  p_amount NUMERIC,
  p_description TEXT DEFAULT 'Traspaso',
  p_date DATE DEFAULT CURRENT_DATE,
  p_category_slug TEXT DEFAULT 'traspaso'
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_group_id UUID := gen_random_uuid();
  v_cat_id UUID;
BEGIN
  SELECT id INTO v_cat_id FROM categories WHERE slug = p_category_slug;

  INSERT INTO ledger_entries (user_id, account_id, entry_type, amount, description, category_id, occurred_on, source, transfer_group_id)
  VALUES (p_user_id, p_from_account_id, 'transfer', -ABS(p_amount), p_description, v_cat_id, p_date, 'app', v_group_id);

  INSERT INTO ledger_entries (user_id, account_id, entry_type, amount, description, category_id, occurred_on, source, transfer_group_id)
  VALUES (p_user_id, p_to_account_id, 'transfer', ABS(p_amount), p_description, v_cat_id, p_date, 'app', v_group_id);

  RETURN v_group_id;
END;
$$;

CREATE OR REPLACE FUNCTION fn_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ──────────────────────────────────────────────────────────────
-- 20. Triggers
-- ──────────────────────────────────────────────────────────────

CREATE TRIGGER trg_accounts_v2_updated_at
  BEFORE UPDATE ON accounts_v2
  FOR EACH ROW EXECUTE FUNCTION fn_updated_at();

-- ──────────────────────────────────────────────────────────────
-- 21. RLS on new tables
-- ──────────────────────────────────────────────────────────────

ALTER TABLE accounts_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE installment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_yield_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own accounts" ON accounts_v2
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own ledger entries" ON ledger_entries
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own statements" ON card_statements
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own installment plans" ON installment_plans
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own recurring rules" ON recurring_rules
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own yield tiers" ON account_yield_tiers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM accounts_v2 a WHERE a.id = account_id AND a.user_id = auth.uid())
  );

-- categories is public read
CREATE POLICY "Anyone can read categories" ON categories FOR SELECT USING (true);

-- migration_review is not exposed via API

-- ──────────────────────────────────────────────────────────────
-- 22. Rename old tables with _legacy suffix (keep data, don't drop)
-- ──────────────────────────────────────────────────────────────

ALTER TABLE cards RENAME TO cards_legacy;
ALTER TABLE transactions RENAME TO transactions_legacy;
ALTER TABLE fixed_expenses RENAME TO fixed_expenses_legacy;
ALTER TABLE income_sources RENAME TO income_sources_legacy;

-- Rename accounts_v2 to accounts (debts already claimed the old name)
ALTER TABLE accounts_v2 RENAME TO accounts;
ALTER INDEX idx_accounts_v2_user RENAME TO idx_accounts_user_v2;
ALTER INDEX idx_accounts_v2_type RENAME TO idx_accounts_type;

-- ──────────────────────────────────────────────────────────────
-- 23. Verification queries (informational, wrapped in DO block)
-- ──────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_legacy_tx_count BIGINT;
  v_ledger_count BIGINT;
  v_legacy_cards_count BIGINT;
  v_accounts_count BIGINT;
  v_review_count BIGINT;
BEGIN
  SELECT count(*) INTO v_legacy_tx_count FROM transactions_legacy;
  SELECT count(*) INTO v_ledger_count FROM ledger_entries;
  SELECT count(*) INTO v_legacy_cards_count FROM cards_legacy;
  SELECT count(*) INTO v_accounts_count FROM accounts;
  SELECT count(*) INTO v_review_count FROM migration_review;

  RAISE NOTICE 'Migration verification:';
  RAISE NOTICE '  Legacy transactions: %, Ledger entries: %', v_legacy_tx_count, v_ledger_count;
  RAISE NOTICE '  Legacy cards: %, New accounts: %', v_legacy_cards_count, v_accounts_count;
  RAISE NOTICE '  Migration review items: %', v_review_count;
END;
$$;

COMMIT;
