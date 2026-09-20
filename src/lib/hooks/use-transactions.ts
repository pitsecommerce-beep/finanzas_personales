'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import type { Transaction } from '@/types/database'

const TX_SELECT = '*, card:cards!transactions_card_id_fkey(*), transfer_from_card:cards!transactions_transfer_from_card_id_fkey(id, alias, bank_name, card_type), transfer_to_card:cards!transactions_transfer_to_card_id_fkey(id, alias, bank_name, card_type)'

interface UseTransactionsOptions {
  type?: 'expense' | 'income'
  cardId?: string
  startDate?: string
  endDate?: string
  category?: string
  isTransfer?: boolean
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
        .select(TX_SELECT)
        .order('date', { ascending: false })

      if (options.type) query = query.eq('type', options.type)
      if (options.cardId) query = query.eq('card_id', options.cardId)
      if (options.startDate) query = query.gte('date', options.startDate)
      if (options.endDate) query = query.lte('date', options.endDate)
      if (options.category) query = query.eq('category', options.category)
      if (options.isTransfer !== undefined) query = query.eq('is_transfer', options.isTransfer)

      const { data } = await query
      setTransactions(data ?? [])
    } catch (err) {
      console.warn('[Nummo] Error al cargar transacciones:', err)
    }
    setLoading(false)
  }, [options.type, options.cardId, options.startDate, options.endDate, options.category, options.isTransfer])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  async function updateCardBalance(cardId: string, amount: number, type: 'expense' | 'income') {
    const supabase = createClient()
    const { data: card } = await supabase
      .from('cards')
      .select('balance, card_type, used_credit')
      .eq('id', cardId)
      .single()

    if (!card) return

    if (card.card_type === 'credit') {
      const currentUsed = Number(card.used_credit ?? 0)
      const newUsed = type === 'expense'
        ? currentUsed + amount
        : Math.max(0, currentUsed - amount)
      await supabase
        .from('cards')
        .update({ used_credit: newUsed })
        .eq('id', cardId)
      return
    }

    if (card.balance == null) return
    const balanceTypes = ['debit', 'cash', 'savings', 'voucher']
    if (!balanceTypes.includes(card.card_type)) return

    const newBalance = type === 'expense'
      ? card.balance - amount
      : card.balance + amount

    await supabase
      .from('cards')
      .update({ balance: newBalance })
      .eq('id', cardId)
  }

  async function reverseBalances(tx: Transaction) {
    if (tx.is_transfer) {
      if (tx.transfer_from_card_id) await updateCardBalance(tx.transfer_from_card_id, tx.amount, 'income')
      if (tx.transfer_to_card_id) await updateCardBalance(tx.transfer_to_card_id, tx.amount, 'expense')
    } else if (tx.card_id) {
      const reverseType = tx.type === 'expense' ? 'income' : 'expense'
      await updateCardBalance(tx.card_id, tx.amount, reverseType as 'expense' | 'income')
    }
  }

  async function addTransaction(
    transaction: Record<string, unknown>
  ) {
    if (!isSupabaseConfigured()) return { data: null, error: { message: 'BD no configurada' } }
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { data: null, error: { message: 'No autenticado' } }

      const { data, error } = await supabase
        .from('transactions')
        .insert({ ...transaction, user_id: user.id })
        .select(TX_SELECT)
        .single()

      if (error) {
        console.error('[Nummo] Error al insertar transaccion:', error.message, error.details, error.hint)
        return { data: null, error }
      }

      if (data) {
        const amount = transaction.amount as number
        const isTransfer = transaction.is_transfer as boolean
        if (isTransfer) {
          const fromId = transaction.transfer_from_card_id as string | null
          const toId = transaction.transfer_to_card_id as string | null
          if (fromId) await updateCardBalance(fromId, amount, 'expense')
          if (toId) await updateCardBalance(toId, amount, 'income')
        } else {
          const cardId = transaction.card_id as string | null
          const type = transaction.type as 'expense' | 'income'
          if (cardId) await updateCardBalance(cardId, amount, type)
        }
        setTransactions((prev) => [data, ...prev])
      }
      return { data, error: null }
    } catch (err) {
      console.error('[Nummo] Error inesperado al crear transaccion:', err)
      return { data: null, error: { message: String(err) } }
    }
  }

  async function deleteTransaction(id: string) {
    if (!isSupabaseConfigured()) return { error: { message: 'BD no configurada' } }
    const supabase = createClient()
    const tx = transactions.find((t) => t.id === id)
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (!error) {
      if (tx) await reverseBalances(tx)
      setTransactions((prev) => prev.filter((t) => t.id !== id))
    }
    return { error }
  }

  async function deleteTransactions(ids: string[]) {
    if (!isSupabaseConfigured()) return { error: { message: 'BD no configurada' } }
    const supabase = createClient()
    const toDelete = transactions.filter((t) => ids.includes(t.id))
    const { error } = await supabase.from('transactions').delete().in('id', ids)
    if (!error) {
      for (const tx of toDelete) {
        await reverseBalances(tx)
      }
      setTransactions((prev) => prev.filter((t) => !ids.includes(t.id)))
    }
    return { error }
  }

  async function updateTransaction(id: string, updates: Record<string, unknown>) {
    if (!isSupabaseConfigured()) return { data: null, error: { message: 'BD no configurada' } }
    const supabase = createClient()
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select(TX_SELECT)
      .single()

    if (!error && data) {
      setTransactions((prev) => prev.map((t) => (t.id === id ? data : t)))
    }
    return { data, error }
  }

  return { transactions, loading, addTransaction, updateTransaction, deleteTransaction, deleteTransactions, refetch: fetchTransactions }
}
