'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import type { LedgerEntry } from '@/types/database'

const ENTRY_SELECT = '*, account:accounts(*), category:categories(*)'

interface UseLedgerOptions {
  entryType?: 'expense' | 'income'
  accountId?: string
  startDate?: string
  endDate?: string
  categorySlug?: string
  excludeTransfers?: boolean
  excludeDeleted?: boolean
}

export function useLedger(options: UseLedgerOptions = {}) {
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(true)

  const {
    entryType,
    accountId,
    startDate,
    endDate,
    categorySlug,
    excludeTransfers = true,
    excludeDeleted = true,
  } = options

  const fetchEntries = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }
    try {
      const supabase = createClient()
      let query = supabase
        .from('ledger_entries')
        .select(ENTRY_SELECT)
        .order('occurred_on', { ascending: false })

      if (excludeDeleted) query = query.is('deleted_at', null)
      if (entryType) query = query.eq('entry_type', entryType)
      if (accountId) query = query.eq('account_id', accountId)
      if (startDate) query = query.gte('occurred_on', startDate)
      if (endDate) query = query.lte('occurred_on', endDate)
      if (excludeTransfers) query = query.neq('entry_type', 'transfer')

      if (categorySlug) {
        const { data: cat } = await supabase
          .from('categories')
          .select('id')
          .eq('slug', categorySlug)
          .single()
        if (cat) query = query.eq('category_id', cat.id)
      }

      const { data } = await query
      setEntries(data ?? [])
    } catch (err) {
      console.warn('[Nummo] Error al cargar movimientos:', err)
    }
    setLoading(false)
  }, [entryType, accountId, startDate, endDate, categorySlug, excludeTransfers, excludeDeleted])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  async function addEntry(entry: Record<string, unknown>) {
    if (!isSupabaseConfigured()) return { data: null, error: { message: 'BD no configurada' } }
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { data: null, error: { message: 'No autenticado' } }

      const { data, error } = await supabase
        .from('ledger_entries')
        .insert({ ...entry, user_id: user.id })
        .select(ENTRY_SELECT)
        .single()

      if (error) {
        console.error('[Nummo] Error al insertar movimiento:', error.message)
        return { data: null, error }
      }

      if (data) {
        setEntries((prev) => [data, ...prev])
      }
      return { data, error: null }
    } catch (err) {
      console.error('[Nummo] Error inesperado:', err)
      return { data: null, error: { message: String(err) } }
    }
  }

  async function addTransfer(params: {
    fromAccountId: string
    toAccountId: string
    amount: number
    description: string
    date: string
    categorySlug?: string
  }) {
    if (!isSupabaseConfigured()) return { data: null, error: { message: 'BD no configurada' } }
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { data: null, error: { message: 'No autenticado' } }

      const { data: catData } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', params.categorySlug ?? 'traspaso')
        .single()

      const groupId = crypto.randomUUID()

      const { error } = await supabase.from('ledger_entries').insert([
        {
          user_id: user.id,
          account_id: params.fromAccountId,
          entry_type: 'transfer',
          amount: -Math.abs(params.amount),
          description: params.description,
          category_id: catData?.id ?? null,
          occurred_on: params.date,
          source: 'app',
          transfer_group_id: groupId,
        },
        {
          user_id: user.id,
          account_id: params.toAccountId,
          entry_type: 'transfer',
          amount: Math.abs(params.amount),
          description: params.description,
          category_id: catData?.id ?? null,
          occurred_on: params.date,
          source: 'app',
          transfer_group_id: groupId,
        },
      ])

      if (error) {
        console.error('[Nummo] Error al crear traspaso:', error.message)
        return { data: null, error }
      }

      await fetchEntries()
      return { data: { transfer_group_id: groupId }, error: null }
    } catch (err) {
      return { data: null, error: { message: String(err) } }
    }
  }

  async function softDeleteEntry(id: string) {
    if (!isSupabaseConfigured()) return { error: { message: 'BD no configurada' } }
    const supabase = createClient()
    const { error } = await supabase
      .from('ledger_entries')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (!error) {
      setEntries((prev) => prev.filter((e) => e.id !== id))
    }
    return { error }
  }

  async function softDeleteEntries(ids: string[]) {
    if (!isSupabaseConfigured()) return { error: { message: 'BD no configurada' } }
    const supabase = createClient()
    const { error } = await supabase
      .from('ledger_entries')
      .update({ deleted_at: new Date().toISOString() })
      .in('id', ids)

    if (!error) {
      setEntries((prev) => prev.filter((e) => !ids.includes(e.id)))
    }
    return { error }
  }

  async function updateEntry(id: string, updates: Record<string, unknown>) {
    if (!isSupabaseConfigured()) return { data: null, error: { message: 'BD no configurada' } }
    const supabase = createClient()
    const { data, error } = await supabase
      .from('ledger_entries')
      .update(updates)
      .eq('id', id)
      .select(ENTRY_SELECT)
      .single()

    if (!error && data) {
      setEntries((prev) => prev.map((e) => (e.id === id ? data : e)))
    }
    return { data, error }
  }

  return {
    entries,
    loading,
    addEntry,
    addTransfer,
    updateEntry,
    softDeleteEntry,
    softDeleteEntries,
    refetch: fetchEntries,
  }
}
