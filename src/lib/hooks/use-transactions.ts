// @deprecated Use useLedger from @/lib/data instead
'use client'
import type { Transaction } from '@/types/database'
export function useTransactions() {
  return { transactions: [] as Transaction[], loading: false, addTransaction: async () => null, deleteTransaction: async () => null, refetch: async () => {} }
}
