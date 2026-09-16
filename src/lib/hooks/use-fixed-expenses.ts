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
    expense: Record<string, unknown>
  ) {
    if (!isSupabaseConfigured()) return { data: null, error: { message: 'BD no configurada' } }
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { data: null, error: { message: 'No autenticado' } }

      const { data, error } = await supabase
        .from('fixed_expenses')
        .insert({ ...expense, user_id: user.id })
        .select('*, card:cards(*)')
        .single()

      if (error) {
        console.error('[Nummo] Error al insertar gasto fijo:', error.message, error.details, error.hint)
        return { data: null, error }
      }

      if (data) setExpenses((prev) => [data, ...prev])
      return { data, error: null }
    } catch (err) {
      console.error('[Nummo] Error inesperado gasto fijo:', err)
      return { data: null, error: { message: String(err) } }
    }
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

  async function updateExpense(id: string, updates: Record<string, unknown>) {
    if (!isSupabaseConfigured()) return { data: null, error: { message: 'BD no configurada' } }
    const supabase = createClient()
    const { data, error } = await supabase
      .from('fixed_expenses')
      .update(updates)
      .eq('id', id)
      .select('*, card:cards(*)')
      .single()

    if (!error && data) {
      setExpenses((prev) => prev.map((e) => (e.id === id ? data : e)))
    }
    return { data, error }
  }

  return { expenses, loading, addExpense, updateExpense, deleteExpense, refetch: fetchExpenses }
}
