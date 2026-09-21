'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import type { RecurringRule } from '@/types/database'

const RULE_SELECT = '*, account:accounts(*), category:categories(*)'

export function useRecurringRules() {
  const [rules, setRules] = useState<RecurringRule[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRules = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('recurring_rules')
        .select(RULE_SELECT)
        .order('created_at', { ascending: false })
      setRules(data ?? [])
    } catch (err) {
      console.warn('[Nummo] Error al cargar reglas recurrentes:', err)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchRules()
  }, [fetchRules])

  async function addRule(rule: Record<string, unknown>) {
    if (!isSupabaseConfigured()) return { data: null, error: { message: 'BD no configurada' } }
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: { message: 'No autenticado' } }

    const { data, error } = await supabase
      .from('recurring_rules')
      .insert({ ...rule, user_id: user.id })
      .select(RULE_SELECT)
      .single()

    if (!error && data) {
      setRules((prev) => [data, ...prev])
    }
    return { data, error }
  }

  async function updateRule(id: string, updates: Record<string, unknown>) {
    if (!isSupabaseConfigured()) return { data: null, error: { message: 'BD no configurada' } }
    const supabase = createClient()
    const { data, error } = await supabase
      .from('recurring_rules')
      .update(updates)
      .eq('id', id)
      .select(RULE_SELECT)
      .single()

    if (!error && data) {
      setRules((prev) => prev.map((r) => (r.id === id ? data : r)))
    }
    return { data, error }
  }

  async function deleteRule(id: string) {
    if (!isSupabaseConfigured()) return { error: { message: 'BD no configurada' } }
    const supabase = createClient()
    const { error } = await supabase.from('recurring_rules').delete().eq('id', id)
    if (!error) {
      setRules((prev) => prev.filter((r) => r.id !== id))
    }
    return { error }
  }

  function getIncomeRules() {
    return rules.filter((r) => r.entry_type === 'income')
  }

  function getExpenseRules() {
    return rules.filter((r) => r.entry_type === 'expense')
  }

  return {
    rules,
    loading,
    addRule,
    updateRule,
    deleteRule,
    getIncomeRules,
    getExpenseRules,
    refetch: fetchRules,
  }
}
