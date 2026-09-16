ALTER TYPE card_type ADD VALUE IF NOT EXISTS 'investment';

ALTER TABLE cards ADD COLUMN IF NOT EXISTS investment_platform TEXT;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS investment_ticker TEXT;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS investment_shares NUMERIC(16,6);
ALTER TABLE cards ADD COLUMN IF NOT EXISTS investment_buy_price NUMERIC(12,2);
ALTER TABLE cards ADD COLUMN IF NOT EXISTS investment_buy_date DATE;
