'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import type { InstallmentPlan } from '@/types/database'

const PLAN_SELECT = '*, account:accounts(*), category:categories(*)'

export function useInstallmentPlans() {
  const [plans, setPlans] = useState<InstallmentPlan[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPlans = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('installment_plans')
        .select(PLAN_SELECT)
        .order('created_at', { ascending: false })
      setPlans(data ?? [])
    } catch (err) {
      console.warn('[Nummo] Error al cargar planes MSI:', err)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

  async function addPlan(plan: Record<string, unknown>) {
    if (!isSupabaseConfigured()) return { data: null, error: { message: 'BD no configurada' } }
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { data: null, error: { message: 'No autenticado' } }

      const { data, error } = await supabase
        .from('installment_plans')
        .insert({ ...plan, user_id: user.id })
        .select(PLAN_SELECT)
        .single()

      if (error) return { data: null, error }
      if (data) setPlans((prev) => [data, ...prev])
      return { data, error: null }
    } catch (err) {
      return { data: null, error: { message: String(err) } }
    }
  }

  async function updatePlan(id: string, updates: Record<string, unknown>) {
    if (!isSupabaseConfigured()) return { data: null, error: { message: 'BD no configurada' } }
    const supabase = createClient()
    const { data, error } = await supabase
      .from('installment_plans')
      .update(updates)
      .eq('id', id)
      .select(PLAN_SELECT)
      .single()

    if (!error && data) {
      setPlans((prev) => prev.map((p) => (p.id === id ? data : p)))
    }
    return { data, error }
  }

  async function deletePlan(id: string) {
    if (!isSupabaseConfigured()) return { error: { message: 'BD no configurada' } }
    const supabase = createClient()
    const { error } = await supabase.from('installment_plans').delete().eq('id', id)
    if (!error) {
      setPlans((prev) => prev.filter((p) => p.id !== id))
    }
    return { error }
  }

  return { plans, loading, addPlan, updatePlan, deletePlan, refetch: fetchPlans }
}
