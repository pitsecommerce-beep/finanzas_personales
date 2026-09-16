export type CardType = 'credit' | 'debit' | 'cash'
export type TransactionType = 'expense' | 'income'
export type FrequencyType = 'weekly' | 'biweekly' | 'monthly'
export type FixedExpenseStatus = 'active' | 'completed' | 'cancelled'

export interface Card {
  id: string
  user_id: string
  bank_name: string
  alias: string
  card_type: CardType
  last_four_digits: string | null
  cut_off_day: number | null
  payment_day: number | null
  credit_limit: number | null
  balance: number | null
  has_yields: boolean
  yield_rate: number | null
  last_yield_date: string | null
  color: string
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  user_id: string
  card_id: string | null
  amount: number
  description: string
  category: string
  type: TransactionType
  date: string
  is_recurring: boolean
  installment_months: number | null
  installment_current: number | null
  notes: string | null
  created_at: string
  card?: Card
}

export interface FixedExpense {
  id: string
  user_id: string
  card_id: string | null
  description: string
  total_amount: number
  monthly_amount: number
  total_months: number
  start_date: string
  category: string
  status: FixedExpenseStatus
  created_at: string
  card?: Card
}

export interface IncomeSource {
  id: string
  user_id: string
  description: string
  amount: number
  frequency: FrequencyType
  next_payment_date: string | null
  created_at: string
}

export type AccountType = 'receivable' | 'payable'

export interface Account {
  id: string
  user_id: string
  type: AccountType
  person_name: string
  description: string
  amount: number
  due_date: string | null
  is_paid: boolean
  created_at: string
}

export type GenderType = 'male' | 'female' | 'other' | 'prefer_not_to_say'

export interface Profile {
  id: string
  user_id: string
  full_name: string
  birth_date: string | null
  gender: GenderType | null
  created_at: string
  updated_at: string
}

export interface AIConfig {
  id: string
  user_id: string
  system_prompt: string
  model: string
  created_at: string
  updated_at: string
}
