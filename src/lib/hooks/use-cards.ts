'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import type { Card } from '@/types/database'

export function useCards() {
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCards = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      console.warn('[Nummo] Tarjetas: sin conexión a BD')
      setLoading(false)
      return
    }
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('cards')
        .select('*')
        .order('created_at', { ascending: false })
      setCards(data ?? [])
    } catch (err) {
      console.warn('[Nummo] Error al cargar tarjetas:', err)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchCards()
  }, [fetchCards])

  async function addCard(card: Record<string, unknown>) {
    if (!isSupabaseConfigured()) return { data: null, error: { message: 'BD no configurada' } }
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('cards')
      .insert({ ...card, user_id: user.id })
      .select()
      .single()

    if (!error && data) {
      setCards((prev) => [data, ...prev])
    }
    return { data, error }
  }

  async function updateCard(id: string, updates: Partial<Card>) {
    if (!isSupabaseConfigured()) return { data: null, error: { message: 'BD no configurada' } }
    const supabase = createClient()
    const { data, error } = await supabase
      .from('cards')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (!error && data) {
      setCards((prev) => prev.map((c) => (c.id === id ? data : c)))
    }
    return { data, error }
  }

  async function deleteCard(id: string) {
    if (!isSupabaseConfigured()) return { error: { message: 'BD no configurada' } }
    const supabase = createClient()
    const { error } = await supabase.from('cards').delete().eq('id', id)
    if (!error) {
      setCards((prev) => prev.filter((c) => c.id !== id))
    }
    return { error }
  }

  return { cards, loading, addCard, updateCard, deleteCard, refetch: fetchCards }
}
