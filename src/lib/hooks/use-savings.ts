// @deprecated Use useSavings from @/lib/data instead
'use client'
import type { SavingsGoal } from '@/types/database'
export function useSavings() {
  return { goals: [] as SavingsGoal[], loading: false, addGoal: async () => null, updateGoal: async () => null, deleteGoal: async () => null, refetch: async () => {} }
}
