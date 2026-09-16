'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import type { SavingsGoal } from '@/types/database'

export function useSavings() {
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [loading, setLoading] = useState(true)

  const fetchGoals = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('savings_goals')
        .select('*, card:cards!savings_goals_card_id_fkey(*), source_card:cards!savings_goals_source_card_id_fkey(*)')
        .order('created_at', { ascending: false })
      setGoals(data ?? [])
    } catch (err) {
      console.warn('[Nummo] Error al cargar metas de ahorro:', err)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  async function addGoal(goal: Record<string, unknown>) {
    if (!isSupabaseConfigured()) return { data: null, error: { message: 'BD no configurada' } }
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: { message: 'No autenticado' } }

    const { data, error } = await supabase
      .from('savings_goals')
      .insert({ ...goal, user_id: user.id })
      .select('*, card:cards!savings_goals_card_id_fkey(*), source_card:cards!savings_goals_source_card_id_fkey(*)')
      .single()

    if (error) {
      console.error('[Nummo] Error al guardar meta:', error.message, error.details, error.hint)
      return { data: null, error }
    }
    if (data) {
      setGoals((prev) => [data, ...prev])
    }
    return { data, error: null }
  }

  async function updateGoal(id: string, updates: Record<string, unknown>) {
    if (!isSupabaseConfigured()) return { data: null, error: { message: 'BD no configurada' } }
    const supabase = createClient()
    const { data, error } = await supabase
      .from('savings_goals')
      .update(updates)
      .eq('id', id)
      .select('*, card:cards!savings_goals_card_id_fkey(*), source_card:cards!savings_goals_source_card_id_fkey(*)')
      .single()

    if (!error && data) {
      setGoals((prev) => prev.map((g) => (g.id === id ? data : g)))
    }
    return { data, error }
  }

  async function deleteGoal(id: string) {
    if (!isSupabaseConfigured()) return { error: { message: 'BD no configurada' } }
    const supabase = createClient()
    const { error } = await supabase.from('savings_goals').delete().eq('id', id)
    if (!error) {
      setGoals((prev) => prev.filter((g) => g.id !== id))
    }
    return { error }
  }

  return { goals, loading, addGoal, updateGoal, deleteGoal, refetch: fetchGoals }
}
