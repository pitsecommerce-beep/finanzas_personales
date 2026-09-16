'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { adjustDateToBusinessDay } from '@/lib/utils/dates'
import type { IncomeSource } from '@/types/database'

export function useIncome() {
  const [sources, setSources] = useState<IncomeSource[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSources = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      console.warn('[Nummo] Ingresos: sin conexión a BD')
      setLoading(false)
      return
    }
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('income_sources')
        .select('*, card:cards(*)')
        .order('created_at', { ascending: false })
      setSources(data ?? [])
    } catch (err) {
      console.warn('[Nummo] Error al cargar ingresos:', err)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchSources()
  }, [fetchSources])

  async function addSource(source: Record<string, unknown>) {
    if (!isSupabaseConfigured()) return { data: null, error: { message: 'BD no configurada' } }
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const nextDate = source.next_payment_date as string | null
    const adjustedSource = {
      ...source,
      user_id: user.id,
      next_payment_date: nextDate ? adjustDateToBusinessDay(nextDate) : null,
    }

    const { data, error } = await supabase
      .from('income_sources')
      .insert(adjustedSource)
      .select('*, card:cards(*)')
      .single()

    if (!error && data) {
      setSources((prev) => [data, ...prev])
    }
    return { data, error }
  }

  async function updateSource(id: string, updates: Record<string, unknown>) {
    if (!isSupabaseConfigured()) return { data: null, error: { message: 'BD no configurada' } }
    const supabase = createClient()

    const nextDate = updates.next_payment_date as string | null
    const adjusted = {
      ...updates,
      next_payment_date: nextDate ? adjustDateToBusinessDay(nextDate) : null,
    }

    const { data, error } = await supabase
      .from('income_sources')
      .update(adjusted)
      .eq('id', id)
      .select('*, card:cards(*)')
      .single()

    if (!error && data) {
      setSources((prev) => prev.map((s) => (s.id === id ? data : s)))
    }
    return { data, error }
  }

  async function deleteSource(id: string) {
    if (!isSupabaseConfigured()) return { error: { message: 'BD no configurada' } }
    const supabase = createClient()
    const { error } = await supabase.from('income_sources').delete().eq('id', id)
    if (!error) {
      setSources((prev) => prev.filter((s) => s.id !== id))
    }
    return { error }
  }

  return { sources, loading, addSource, updateSource, deleteSource, refetch: fetchSources }
}
