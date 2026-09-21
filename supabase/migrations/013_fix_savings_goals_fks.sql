-- Fix savings_goals foreign keys: re-point from cards_legacy to accounts
-- Run this if migration 012 already executed

ALTER TABLE savings_goals DROP CONSTRAINT IF EXISTS savings_goals_card_id_fkey;
ALTER TABLE savings_goals DROP CONSTRAINT IF EXISTS savings_goals_source_card_id_fkey;

ALTER TABLE savings_goals
  ADD CONSTRAINT savings_goals_card_id_fkey
    FOREIGN KEY (card_id) REFERENCES accounts(id) ON DELETE SET NULL;

ALTER TABLE savings_goals
  ADD CONSTRAINT savings_goals_source_card_id_fkey
    FOREIGN KEY (source_card_id) REFERENCES accounts(id) ON DELETE SET NULL;
