'use client'

import { useEffect, useState } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/components/ui/toast'

export default function ConfiguracionPage() {
  const [systemPrompt, setSystemPrompt] = useState('')
  const [model, setModel] = useState('claude-sonnet-4-20250514')
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [showLogout, setShowLogout] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    async function load() {
      if (!isSupabaseConfigured()) {
        console.warn('[Nummo] Configuración: sin conexión a BD')
        setLoadingData(false)
        return
      }
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoadingData(false); return }

        const { data } = await supabase
          .from('ai_config')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (data) {
          setSystemPrompt(data.system_prompt)
          setModel(data.model)
        }
      } catch (err) {
        console.warn('[Nummo] Error al cargar configuración:', err)
      }
      setLoadingData(false)
    }
    load()
  }, [])

  async function handleSave() {
    if (!isSupabaseConfigured()) { toast('BD no configurada', 'error'); return }
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('ai_config')
      .upsert({
        user_id: user.id,
        system_prompt: systemPrompt,
        model,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    setLoading(false)

    if (error) {
      toast('Error al guardar', 'error')
    } else {
      toast('Configuración guardada', 'success')
    }
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">Configuración</h1>

      <div className="bg-white rounded-xl border border-border p-6 space-y-4">
        <h2 className="font-semibold">Asesor IA</h2>
        <p className="text-sm text-muted">Personaliza el comportamiento del asesor financiero</p>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-foreground">Prompt del sistema</label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={6}
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 resize-y"
            placeholder="Instrucciones para el asesor IA..."
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-foreground">Modelo</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          >
            <option value="claude-sonnet-4-20250514">Claude Sonnet 4</option>
            <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5</option>
          </select>
        </div>

        <Button onClick={handleSave} loading={loading}>
          Guardar configuración
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-border p-6 space-y-3">
        <h2 className="font-semibold">Cuenta</h2>
        <p className="text-sm text-muted">Gestiona tu cuenta y sesión</p>
        <Button variant="danger" onClick={() => setShowLogout(true)}>
          Cerrar sesión
        </Button>
      </div>

      <ConfirmDialog
        open={showLogout}
        title="Cerrar sesion"
        message="¿Seguro que deseas cerrar tu sesion?"
        confirmLabel="Cerrar sesion"
        variant="warning"
        onConfirm={async () => {
          const supabase = createClient()
          await supabase.auth.signOut()
          window.location.href = '/login'
        }}
        onCancel={() => setShowLogout(false)}
      />
    </div>
  )
}
