'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import type { Profile } from '@/types/database'

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      setProfile(data)
    } catch {
      // no profile yet
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  async function saveProfile(profileData: { full_name: string; birth_date: string | null; gender: string | null }) {
    if (!isSupabaseConfigured()) return { error: { message: 'BD no configurada' } }
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: { message: 'No autenticado' } }

    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        user_id: user.id,
        full_name: profileData.full_name,
        birth_date: profileData.birth_date,
        gender: profileData.gender,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select()
      .single()

    if (!error && data) {
      setProfile(data)
    }
    return { data, error }
  }

  const firstName = profile?.full_name?.split(' ')[0] ?? null

  return { profile, firstName, loading, saveProfile, refetch: fetchProfile }
}
