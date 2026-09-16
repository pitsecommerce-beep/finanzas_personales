'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import type { FixedExpense } from '@/types/database'

export function useFixedExpenses() {
  const [expenses, setExpenses] = useState<FixedExpense[]>([])
  const [loading, setLoading] = useState(true)

  const fetchExpenses = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      console.warn('[Nummo] Gastos fijos: sin conexión a BD')
      setLoading(false)
      return
    }
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('fixed_expenses')
        .select('*, card:cards(*)')
        .order('created_at', { ascending: false })
      setExpenses(data ?? [])
    } catch (err) {
      console.warn('[Nummo] Error al cargar gastos fijos:', err)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  async function addExpense(
    expense: Omit<FixedExpense, 'id' | 'user_id' | 'created_at' | 'card'>
  ) {
    if (!isSupabaseConfigured()) return { data: null, error: { message: 'BD no configurada' } }
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('fixed_expenses')
      .insert({ ...expense, user_id: user.id })
      .select('*, card:cards(*)')
      .single()

    if (!error && data) {
      setExpenses((prev) => [data, ...prev])
    }
    return { data, error }
  }

  async function deleteExpense(id: string) {
    if (!isSupabaseConfigured()) return { error: { message: 'BD no configurada' } }
    const supabase = createClient()
    const { error } = await supabase.from('fixed_expenses').delete().eq('id', id)
    if (!error) {
      setExpenses((prev) => prev.filter((e) => e.id !== id))
    }
    return { error }
  }

  return { expenses, loading, addExpense, deleteExpense, refetch: fetchExpenses }
}
