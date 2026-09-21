// @deprecated Use useAccounts from @/lib/data instead
'use client'
import type { Card } from '@/types/database'
export function useCards() {
  return { cards: [] as Card[], loading: false, addCard: async () => null, updateCard: async () => null, deleteCard: async () => null, refetch: async () => {} }
}
