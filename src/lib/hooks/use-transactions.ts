'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
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
    if (!isSupabaseConfigured()) {
      console.warn('[Nummo] Transacciones: sin conexión a BD')
      setLoading(false)
      return
    }
    try {
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
    } catch (err) {
      console.warn('[Nummo] Error al cargar transacciones:', err)
    }
    setLoading(false)
  }, [options.type, options.cardId, options.startDate, options.endDate, options.category])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  async function updateCardBalance(cardId: string, amount: number, type: 'expense' | 'income') {
    const supabase = createClient()
    const { data: card } = await supabase
      .from('cards')
      .select('balance, card_type')
      .eq('id', cardId)
      .single()

    if (!card || card.balance == null) return
    if (card.card_type !== 'debit' && card.card_type !== 'cash') return

    const newBalance = type === 'expense'
      ? card.balance - amount
      : card.balance + amount

    await supabase
      .from('cards')
      .update({ balance: newBalance })
      .eq('id', cardId)
  }

  async function addTransaction(
    transaction: Record<string, unknown>
  ) {
    if (!isSupabaseConfigured()) return { data: null, error: { message: 'BD no configurada' } }
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('transactions')
      .insert({ ...transaction, user_id: user.id })
      .select('*, card:cards(*)')
      .single()

    if (!error && data) {
      const cardId = transaction.card_id as string | null
      const amount = transaction.amount as number
      const type = transaction.type as 'expense' | 'income'
      if (cardId) {
        await updateCardBalance(cardId, amount, type)
      }
      setTransactions((prev) => [data, ...prev])
    }
    return { data, error }
  }

  async function deleteTransaction(id: string) {
    if (!isSupabaseConfigured()) return { error: { message: 'BD no configurada' } }
    const supabase = createClient()

    const tx = transactions.find((t) => t.id === id)

    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (!error) {
      if (tx?.card_id) {
        const reverseType = tx.type === 'expense' ? 'income' : 'expense'
        await updateCardBalance(tx.card_id, tx.amount, reverseType as 'expense' | 'income')
      }
      setTransactions((prev) => prev.filter((t) => t.id !== id))
    }
    return { error }
  }

  return { transactions, loading, addTransaction, deleteTransaction, refetch: fetchTransactions }
}
