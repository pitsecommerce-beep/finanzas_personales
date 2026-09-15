'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import type { Account } from '@/types/database'

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAccounts = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      console.warn('[FinanzApp] Cuentas: sin conexión a BD')
      setLoading(false)
      return
    }
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('accounts')
        .select('*')
        .order('due_date', { ascending: true, nullsFirst: false })
      setAccounts(data ?? [])
    } catch (err) {
      console.warn('[FinanzApp] Error al cargar cuentas:', err)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  async function addAccount(account: Omit<Account, 'id' | 'user_id' | 'created_at'>) {
    if (!isSupabaseConfigured()) return { data: null, error: { message: 'BD no configurada' } }
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('accounts')
      .insert({ ...account, user_id: user.id })
      .select()
      .single()

    if (!error && data) {
      setAccounts((prev) => [data, ...prev])
    }
    return { data, error }
  }

  async function updateAccount(id: string, updates: Partial<Account>) {
    if (!isSupabaseConfigured()) return { data: null, error: { message: 'BD no configurada' } }
    const supabase = createClient()
    const { data, error } = await supabase
      .from('accounts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (!error && data) {
      setAccounts((prev) => prev.map((a) => (a.id === id ? data : a)))
    }
    return { data, error }
  }

  async function deleteAccount(id: string) {
    if (!isSupabaseConfigured()) return { error: { message: 'BD no configurada' } }
    const supabase = createClient()
    const { error } = await supabase.from('accounts').delete().eq('id', id)
    if (!error) {
      setAccounts((prev) => prev.filter((a) => a.id !== id))
    }
    return { error }
  }

  return { accounts, loading, addAccount, updateAccount, deleteAccount, refetch: fetchAccounts }
}
