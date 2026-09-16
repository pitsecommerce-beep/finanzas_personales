-- Replace age (integer) with birth_date (date) in profiles
ALTER TABLE profiles ADD COLUMN birth_date DATE;
UPDATE profiles SET birth_date = (CURRENT_DATE - (age * INTERVAL '1 year'))::date WHERE age IS NOT NULL;
ALTER TABLE profiles DROP COLUMN age;
