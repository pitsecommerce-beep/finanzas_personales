-- Asegurar que todas las politicas RLS existan correctamente
-- Si ya existen, el DROP + CREATE las recrea limpiamente

-- Profiles
DROP POLICY IF EXISTS "Users can manage their own profile" ON profiles;
CREATE POLICY "Users can manage their own profile" ON profiles
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Cards
DROP POLICY IF EXISTS "Users can manage their own cards" ON cards;
CREATE POLICY "Users can manage their own cards" ON cards
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Transactions
DROP POLICY IF EXISTS "Users can manage their own transactions" ON transactions;
CREATE POLICY "Users can manage their own transactions" ON transactions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Fixed expenses
DROP POLICY IF EXISTS "Users can manage their own fixed expenses" ON fixed_expenses;
CREATE POLICY "Users can manage their own fixed expenses" ON fixed_expenses
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Income sources
DROP POLICY IF EXISTS "Users can manage their own income sources" ON income_sources;
CREATE POLICY "Users can manage their own income sources" ON income_sources
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Accounts
DROP POLICY IF EXISTS "Users can manage their own accounts" ON accounts;
CREATE POLICY "Users can manage their own accounts" ON accounts
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- AI Config
DROP POLICY IF EXISTS "Users can manage their own AI config" ON ai_config;
CREATE POLICY "Users can manage their own AI config" ON ai_config
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Savings goals
DROP POLICY IF EXISTS "Users manage own savings_goals" ON savings_goals;
CREATE POLICY "Users manage own savings_goals" ON savings_goals
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
