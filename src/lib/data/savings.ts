'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import type { SavingsGoal, Account } from '@/types/database'

export function useSavings(accounts: Account[] = []) {
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [loading, setLoading] = useState(true)

  const accountMap = Object.fromEntries(accounts.map(a => [a.id, a]))

  function enrich(goal: Record<string, unknown>): SavingsGoal {
    const g = goal as SavingsGoal
    return {
      ...g,
      source_card: g.source_card_id ? accountMap[g.source_card_id] : undefined,
      card: g.card_id ? accountMap[g.card_id] : undefined,
    }
  }

  const fetchGoals = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('savings_goals')
        .select('*')
        .order('created_at', { ascending: false })
      setGoals((data ?? []) as SavingsGoal[])
    } catch (err) {
      console.warn('[Nummo] Error al cargar metas de ahorro:', err)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  const enrichedGoals = goals.map(g => enrich(g))

  async function addGoal(goal: Record<string, unknown>) {
    if (!isSupabaseConfigured()) return { data: null, error: { message: 'BD no configurada' } }
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: { message: 'No autenticado' } }

    const { data, error } = await supabase
      .from('savings_goals')
      .insert({ ...goal, user_id: user.id })
      .select('*')
      .single()

    if (error) {
      console.error('[Nummo] Error al guardar meta:', error.message)
      return { data: null, error }
    }
    if (data) {
      setGoals(prev => [data as SavingsGoal, ...prev])
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
      .select('*')
      .single()

    if (!error && data) {
      setGoals(prev => prev.map(g => g.id === id ? data as SavingsGoal : g))
    }
    return { data, error }
  }

  async function deleteGoal(id: string) {
    if (!isSupabaseConfigured()) return { error: { message: 'BD no configurada' } }
    const supabase = createClient()
    const { error } = await supabase.from('savings_goals').delete().eq('id', id)
    if (!error) {
      setGoals(prev => prev.filter(g => g.id !== id))
    }
    return { error }
  }

  return { goals: enrichedGoals, loading, addGoal, updateGoal, deleteGoal, refetch: fetchGoals }
}
