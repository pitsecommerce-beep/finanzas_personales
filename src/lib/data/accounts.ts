'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import type { Account, AccountBalance } from '@/types/database'

const ACCOUNT_SELECT = '*'

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAccounts = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('accounts')
        .select(ACCOUNT_SELECT)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      setAccounts(data ?? [])
    } catch (err) {
      console.warn('[Nummo] Error al cargar cuentas:', err)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  async function addAccount(account: Record<string, unknown>) {
    if (!isSupabaseConfigured()) return { data: null, error: { message: 'BD no configurada' } }
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: { message: 'No autenticado' } }

    const { data, error } = await supabase
      .from('accounts')
      .insert({ ...account, user_id: user.id })
      .select(ACCOUNT_SELECT)
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
      .select(ACCOUNT_SELECT)
      .single()

    if (!error && data) {
      setAccounts((prev) => prev.map((a) => (a.id === id ? data : a)))
    }
    return { data, error }
  }

  async function deleteAccount(id: string) {
    if (!isSupabaseConfigured()) return { error: { message: 'BD no configurada' } }
    const supabase = createClient()
    const { error } = await supabase
      .from('accounts')
      .update({ is_active: false, archived_at: new Date().toISOString() })
      .eq('id', id)

    if (!error) {
      setAccounts((prev) => prev.filter((a) => a.id !== id))
    }
    return { error }
  }

  return { accounts, loading, addAccount, updateAccount, deleteAccount, refetch: fetchAccounts }
}

export function useAccountBalances() {
  const [balances, setBalances] = useState<AccountBalance[]>([])
  const [loading, setLoading] = useState(true)

  const fetchBalances = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('v_account_balances')
        .select('*')
      setBalances(data ?? [])
    } catch (err) {
      console.warn('[Nummo] Error al cargar saldos:', err)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchBalances()
  }, [fetchBalances])

  return { balances, loading, refetch: fetchBalances }
}
