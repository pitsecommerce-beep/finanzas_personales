// @deprecated Use useInstallmentPlans from @/lib/data instead
'use client'
import type { FixedExpense } from '@/types/database'
export function useFixedExpenses() {
  return { expenses: [] as FixedExpense[], loading: false, addExpense: async () => null, updateExpense: async () => null, deleteExpense: async () => null, refetch: async () => {} }
}
