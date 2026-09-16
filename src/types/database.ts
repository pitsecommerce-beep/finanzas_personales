export type CardType = 'credit' | 'debit' | 'cash' | 'savings' | 'voucher'
export type TransactionType = 'expense' | 'income'
export type FrequencyType = 'weekly' | 'biweekly' | 'monthly'
export type FixedExpenseStatus = 'active' | 'completed' | 'cancelled'
export type IncomeType = 'salary' | 'freelance' | 'business' | 'investment' | 'rental' | 'other'
export type YieldFrequency = 'daily' | 'monthly' | 'quarterly' | 'annual'

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
  used_credit: number | null
  has_yields: boolean
  yield_rate: number | null
  yield_rate_above_limit: number | null
  yield_frequency: YieldFrequency | null
  money_availability: string | null
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
  is_transfer: boolean
  transfer_from_card_id: string | null
  transfer_to_card_id: string | null
  currency: string
  exchange_rate: number | null
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
  end_date: string | null
  is_msi: boolean
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
  income_type: IncomeType
  card_id: string | null
  next_payment_date: string | null
  created_at: string
  card?: Card
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

export interface SavingsGoal {
  id: string
  user_id: string
  description: string
  monthly_amount: number
  target_amount: number | null
  card_id: string | null
  is_active: boolean
  start_date: string | null
  end_date: string | null
  created_at: string
  card?: Card
}
