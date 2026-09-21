'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { adjustDateToBusinessDay } from '@/lib/utils/dates'
import type { Debt } from '@/types/database'

export function useDebts() {
  const [debts, setDebts] = useState<Debt[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDebts = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('debts')
        .select('*')
        .order('due_date', { ascending: true, nullsFirst: false })
      setDebts(data ?? [])
    } catch (err) {
      console.warn('[Nummo] Error al cargar deudas:', err)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchDebts()
  }, [fetchDebts])

  async function addDebt(debt: Omit<Debt, 'id' | 'user_id' | 'created_at'>) {
    if (!isSupabaseConfigured()) return { data: null, error: { message: 'BD no configurada' } }
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const adjusted = {
      ...debt,
      user_id: user.id,
      due_date: debt.due_date ? adjustDateToBusinessDay(debt.due_date) : null,
    }

    const { data, error } = await supabase
      .from('debts')
      .insert(adjusted)
      .select()
      .single()

    if (!error && data) {
      setDebts((prev) => [data, ...prev])
    }
    return { data, error }
  }

  async function updateDebt(id: string, updates: Partial<Debt>) {
    if (!isSupabaseConfigured()) return { data: null, error: { message: 'BD no configurada' } }
    const supabase = createClient()
    const adjusted = {
      ...updates,
      ...(updates.due_date !== undefined && {
        due_date: updates.due_date ? adjustDateToBusinessDay(updates.due_date) : null,
      }),
    }

    const { data, error } = await supabase
      .from('debts')
      .update(adjusted)
      .eq('id', id)
      .select()
      .single()

    if (!error && data) {
      setDebts((prev) => prev.map((d) => (d.id === id ? data : d)))
    }
    return { data, error }
  }

  async function deleteDebt(id: string) {
    if (!isSupabaseConfigured()) return { error: { message: 'BD no configurada' } }
    const supabase = createClient()
    const { error } = await supabase.from('debts').delete().eq('id', id)
    if (!error) {
      setDebts((prev) => prev.filter((d) => d.id !== id))
    }
    return { error }
  }

  return { debts, loading, addDebt, updateDebt, deleteDebt, refetch: fetchDebts }
}
