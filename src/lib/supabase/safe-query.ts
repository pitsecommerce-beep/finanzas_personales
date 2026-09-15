import { isSupabaseConfigured } from './client'

export async function safeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: any }> {
  if (!isSupabaseConfigured()) {
    console.warn('[FinanzApp] Consulta omitida: Supabase no configurado')
    return { data: null, error: null }
  }
  try {
    return await queryFn()
  } catch (err) {
    console.warn('[FinanzApp] Error en consulta a base de datos:', err)
    return { data: null, error: err }
  }
}
