-- Enums
CREATE TYPE card_type AS ENUM ('credit', 'debit');
CREATE TYPE transaction_type AS ENUM ('expense', 'income');
CREATE TYPE frequency_type AS ENUM ('weekly', 'biweekly', 'monthly');
CREATE TYPE fixed_expense_status AS ENUM ('active', 'completed', 'cancelled');

-- Cards
CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  alias TEXT NOT NULL,
  card_type card_type NOT NULL DEFAULT 'credit',
  last_four_digits TEXT CHECK (length(last_four_digits) = 4),
  cut_off_day INTEGER NOT NULL CHECK (cut_off_day BETWEEN 1 AND 31),
  payment_day INTEGER NOT NULL CHECK (payment_day BETWEEN 1 AND 31),
  credit_limit NUMERIC(12,2),
  color TEXT NOT NULL DEFAULT '#14B8A6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id UUID REFERENCES cards(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'otros',
  type transaction_type NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  installment_months INTEGER,
  installment_current INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fixed expenses (MSI)
CREATE TABLE fixed_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id UUID REFERENCES cards(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  monthly_amount NUMERIC(12,2) NOT NULL,
  total_months INTEGER NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL DEFAULT 'otros',
  status fixed_expense_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Income sources
CREATE TABLE income_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  frequency frequency_type NOT NULL DEFAULT 'monthly',
  next_payment_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Accounts (receivable / payable)
CREATE TYPE account_type AS ENUM ('receivable', 'payable');

CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type account_type NOT NULL,
  person_name TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  due_date DATE,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AI config
CREATE TABLE ai_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  system_prompt TEXT NOT NULL DEFAULT 'Eres un asesor financiero personal. Tienes acceso a los datos financieros del usuario. Ofrece consejos prácticos, identifica patrones de gasto, y sugiere formas de ahorrar. Responde siempre en español y de forma amigable.',
  model TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_cards_user ON cards(user_id);
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date);
CREATE INDEX idx_transactions_card ON transactions(card_id);
CREATE INDEX idx_fixed_expenses_user ON fixed_expenses(user_id);
CREATE INDEX idx_fixed_expenses_card ON fixed_expenses(card_id);
CREATE INDEX idx_income_sources_user ON income_sources(user_id);
CREATE INDEX idx_accounts_user ON accounts(user_id);

-- RLS
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own cards" ON cards FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own transactions" ON transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own fixed expenses" ON fixed_expenses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own income sources" ON income_sources FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own accounts" ON accounts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own AI config" ON ai_config FOR ALL USING (auth.uid() = user_id);
