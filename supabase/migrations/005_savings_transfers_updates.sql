-- Add 'savings' and 'voucher' to card_type enum
ALTER TYPE card_type ADD VALUE IF NOT EXISTS 'savings';
ALTER TYPE card_type ADD VALUE IF NOT EXISTS 'voucher';

-- Savings-specific fields on cards
ALTER TABLE cards ADD COLUMN IF NOT EXISTS yield_frequency TEXT DEFAULT 'daily';
ALTER TABLE cards ADD COLUMN IF NOT EXISTS money_availability TEXT DEFAULT 'immediate';
ALTER TABLE cards ADD COLUMN IF NOT EXISTS yield_rate_above_limit NUMERIC(6,3);

-- Fixed expenses: end_date optional, is_msi flag
ALTER TABLE fixed_expenses ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE fixed_expenses ADD COLUMN IF NOT EXISTS is_msi BOOLEAN NOT NULL DEFAULT true;

-- Income sources: type, account
ALTER TABLE income_sources ADD COLUMN IF NOT EXISTS income_type TEXT DEFAULT 'other';
ALTER TABLE income_sources ADD COLUMN IF NOT EXISTS card_id UUID REFERENCES cards(id) ON DELETE SET NULL;

-- Transactions: is_transfer, transfer fields, currency
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_transfer BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transfer_from_card_id UUID REFERENCES cards(id) ON DELETE SET NULL;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transfer_to_card_id UUID REFERENCES cards(id) ON DELETE SET NULL;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'MXN';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(10,4);

-- Credit card used balance tracking
ALTER TABLE cards ADD COLUMN IF NOT EXISTS used_credit NUMERIC(12,2) DEFAULT 0;

-- Savings goals table
CREATE TABLE IF NOT EXISTS savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  monthly_amount NUMERIC(12,2) NOT NULL,
  target_amount NUMERIC(12,2),
  card_id UUID REFERENCES cards(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own savings_goals"
  ON savings_goals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
