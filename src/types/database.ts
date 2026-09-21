export type AccountType = 'credit_card' | 'debit' | 'cash' | 'savings' | 'voucher' | 'investment'
export type EntryType = 'expense' | 'income' | 'transfer' | 'adjustment' | 'yield'
export type EntrySource = 'app' | 'shortcuts' | 'recurring' | 'system' | 'import'
export type FrequencyType = 'weekly' | 'biweekly' | 'monthly'
export type LiquidityType = 'immediate' | 't_plus_1' | 't_plus_2' | 'locked'
export type YieldCompounding = 'daily' | 'monthly' | 'quarterly' | 'annual'
export type GenderType = 'male' | 'female' | 'other' | 'prefer_not_to_say'
export type DebtType = 'receivable' | 'payable'

export interface Account {
  id: string
  user_id: string
  account_type: AccountType
  institution: string | null
  alias: string
  name: string
  last_four: string | null
  color: string
  currency: string
  is_active: boolean
  archived_at: string | null
  notes: string | null
  cut_off_day: number | null
  payment_day: number | null
  credit_limit: number | null
  interest_rate_annual: number | null
  opening_balance: number
  opening_date: string
  yields_enabled: boolean
  yield_compounding: YieldCompounding | null
  liquidity: LiquidityType | null
  last_yield_applied_on: string | null
  isr_withholding_rate: number
  expires_on: string | null
  allowed_categories: string | null
  is_transferable: boolean
  locked_until: string | null
  created_at: string
  updated_at: string
}

export interface LedgerEntry {
  id: string
  user_id: string
  account_id: string | null
  entry_type: EntryType
  amount: number
  amount_original: number | null
  amount_base: number | null
  currency: string
  fx_rate: number | null
  description: string
  category_id: string | null
  occurred_on: string
  occurred_at: string | null
  notes: string | null
  source: EntrySource
  counterparty: string | null
  idempotency_key: string | null
  transfer_group_id: string | null
  installment_plan_id: string | null
  statement_id: string | null
  deleted_at: string | null
  created_at: string
  account?: Account
  category?: Category
}

export interface Category {
  id: string
  slug: string
  label: string
  emoji: string
  applies_to: string
  sort_order: number
  is_system: boolean
  created_at: string
}

export interface CardStatement {
  id: string
  account_id: string
  user_id: string
  period_start: string
  period_end: string
  payment_due_date: string
  total_amount: number | null
  minimum_payment: number | null
  no_interest_payment: number | null
  is_paid: boolean
  paid_amount: number | null
  paid_on: string | null
  created_at: string
}

export interface InstallmentPlan {
  id: string
  user_id: string
  account_id: string | null
  description: string
  total_amount: number
  monthly_amount: number
  total_months: number
  remaining_months: number
  start_date: string
  end_date: string | null
  category_id: string | null
  currency: string
  fx_rate: number | null
  is_active: boolean
  created_at: string
  account?: Account
  category?: Category
}

export interface RecurringRule {
  id: string
  user_id: string
  account_id: string | null
  entry_type: EntryType
  description: string
  amount: number
  frequency: FrequencyType
  category_id: string | null
  next_occurrence: string | null
  is_active: boolean
  currency: string
  created_at: string
  account?: Account
  category?: Category
}

export interface Debt {
  id: string
  user_id: string
  type: DebtType
  person_name: string
  description: string
  amount: number
  due_date: string | null
  is_paid: boolean
  created_at: string
}

export interface SavingsGoal {
  id: string
  user_id: string
  description: string
  monthly_amount: number
  target_amount: number | null
  source_card_id: string | null
  card_id: string | null
  is_active: boolean
  start_date: string | null
  end_date: string | null
  created_at: string
  source_card?: Account
  card?: Account
}

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

export interface AccountBalance {
  account_id: string
  user_id: string
  alias: string
  account_type: AccountType
  opening_balance: number
  movements_sum: number
  current_balance: number
}

// Legacy type aliases (old hooks still reference these)
export type Card = Account
export type Transaction = LedgerEntry
export type FixedExpense = InstallmentPlan
export type IncomeSource = RecurringRule
