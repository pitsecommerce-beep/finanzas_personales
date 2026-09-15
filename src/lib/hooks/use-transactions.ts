'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Transaction } from '@/types/database'

interface UseTransactionsOptions {
  type?: 'expense' | 'income'
  cardId?: string
  startDate?: string
  endDate?: string
  category?: string
}

export function useTransactions(options: UseTransactionsOptions = {}) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTransactions = useCallback(async () => {
    const supabase = createClient()
    let query = supabase
      .from('transactions')
      .select('*, card:cards(*)')
      .order('date', { ascending: false })

    if (options.type) query = query.eq('type', options.type)
    if (options.cardId) query = query.eq('card_id', options.cardId)
    if (options.startDate) query = query.gte('date', options.startDate)
    if (options.endDate) query = query.lte('date', options.endDate)
    if (options.category) query = query.eq('category', options.category)

    const { data } = await query
    setTransactions(data ?? [])
    setLoading(false)
  }, [options.type, options.cardId, options.startDate, options.endDate, options.category])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  async function addTransaction(
    transaction: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'card'>
  ) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('transactions')
      .insert({ ...transaction, user_id: user.id })
      .select('*, card:cards(*)')
      .single()

    if (!error && data) {
      setTransactions((prev) => [data, ...prev])
    }
    return { data, error }
  }

  async function deleteTransaction(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (!error) {
      setTransactions((prev) => prev.filter((t) => t.id !== id))
    }
    return { error }
  }

  return { transactions, loading, addTransaction, deleteTransaction, refetch: fetchTransactions }
}
