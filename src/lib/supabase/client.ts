import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseKey && supabaseUrl !== 'your_supabase_url')
}

export function createClient() {
  if (!isSupabaseConfigured()) {
    console.warn('[Nummo] Supabase no configurado. La app funcionará en modo local sin persistencia.')
  }
  return createBrowserClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseKey || 'placeholder-key'
  )
}
