'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { IncomeSource } from '@/types/database'

export function useIncome() {
  const [sources, setSources] = useState<IncomeSource[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSources = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('income_sources')
      .select('*')
      .order('created_at', { ascending: false })
    setSources(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchSources()
  }, [fetchSources])

  async function addSource(source: Omit<IncomeSource, 'id' | 'user_id' | 'created_at'>) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('income_sources')
      .insert({ ...source, user_id: user.id })
      .select()
      .single()

    if (!error && data) {
      setSources((prev) => [data, ...prev])
    }
    return { data, error }
  }

  async function deleteSource(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('income_sources').delete().eq('id', id)
    if (!error) {
      setSources((prev) => prev.filter((s) => s.id !== id))
    }
    return { error }
  }

  return { sources, loading, addSource, deleteSource, refetch: fetchSources }
}
