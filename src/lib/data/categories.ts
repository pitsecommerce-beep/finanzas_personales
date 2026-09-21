'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import type { Category } from '@/types/database'

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCategories = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true })
      setCategories(data ?? [])
    } catch (err) {
      console.warn('[Nummo] Error al cargar categorías:', err)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  function getBySlug(slug: string): Category | undefined {
    return categories.find((c) => c.slug === slug)
  }

  function getExpenseCategories(): Category[] {
    return categories.filter((c) => c.applies_to === 'expense' || c.applies_to === 'both')
  }

  function getIncomeCategories(): Category[] {
    return categories.filter((c) => c.applies_to === 'income' || c.applies_to === 'both')
  }

  function getEmoji(slug: string): string {
    return categories.find((c) => c.slug === slug)?.emoji ?? '📦'
  }

  function getLabel(slug: string): string {
    return categories.find((c) => c.slug === slug)?.label ?? 'Otros'
  }

  return {
    categories,
    loading,
    getBySlug,
    getExpenseCategories,
    getIncomeCategories,
    getEmoji,
    getLabel,
    refetch: fetchCategories,
  }
}
