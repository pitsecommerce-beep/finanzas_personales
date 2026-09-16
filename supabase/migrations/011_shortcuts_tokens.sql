CREATE TABLE shortcuts_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL DEFAULT 'Apple Shortcuts',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shortcuts_tokens_token ON shortcuts_tokens(token);
CREATE INDEX idx_shortcuts_tokens_user ON shortcuts_tokens(user_id);

ALTER TABLE shortcuts_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own tokens"
  ON shortcuts_tokens FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
