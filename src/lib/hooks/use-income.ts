// @deprecated Use useRecurringRules from @/lib/data instead
'use client'
import type { IncomeSource } from '@/types/database'
export function useIncome() {
  return { sources: [] as IncomeSource[], loading: false, addSource: async () => null, updateSource: async () => null, deleteSource: async () => null, refetch: async () => {} }
}
