'use client'

import { useEffect, useState } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/components/ui/toast'
import { ChevronDown } from 'lucide-react'

const GENDER_OPTIONS = [
  { value: 'male', label: 'Masculino' },
  { value: 'female', label: 'Femenino' },
  { value: 'other', label: 'Otro' },
  { value: 'prefer_not_to_say', label: 'Prefiero no decir' },
]

export default function ConfiguracionPage() {
  const [fullName, setFullName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)

  const [systemPrompt, setSystemPrompt] = useState('')
  const [model, setModel] = useState('claude-sonnet-4-20250514')
  const [aiOpen, setAiOpen] = useState(false)
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

        const [profileRes, aiRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('user_id', user.id).single(),
          supabase.from('ai_config').select('*').eq('user_id', user.id).single(),
        ])

        if (profileRes.data) {
          setFullName(profileRes.data.full_name ?? '')
          setBirthDate(profileRes.data.birth_date ?? '')
          setGender(profileRes.data.gender ?? '')
        }

        if (aiRes.data) {
          setSystemPrompt(aiRes.data.system_prompt)
          setModel(aiRes.data.model)
        }
      } catch (err) {
        console.warn('[Nummo] Error al cargar configuración:', err)
      }
      setLoadingData(false)
    }
    load()
  }, [])

  async function handleSaveProfile() {
    if (!isSupabaseConfigured()) { toast('BD no configurada', 'error'); return }
    if (!fullName.trim()) { toast('El nombre es obligatorio', 'error'); return }
    setProfileLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setProfileLoading(false); return }

    const { error } = await supabase
      .from('profiles')
      .upsert({
        user_id: user.id,
        full_name: fullName.trim(),
        birth_date: birthDate || null,
        gender: gender || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    setProfileLoading(false)
    toast(error ? 'Error al guardar perfil' : 'Perfil actualizado', error ? 'error' : 'success')
  }

  async function handleSaveAI() {
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
    toast(error ? 'Error al guardar' : 'Configuración guardada', error ? 'error' : 'success')
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
        <h2 className="font-semibold">Información personal</h2>
        <p className="text-sm text-muted">Datos de tu perfil</p>

        <Input
          id="fullName"
          label="Nombre completo"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Tu nombre"
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            id="birthDate"
            label="Fecha de nacimiento"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
          <Select
            id="gender"
            label="Género"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            options={GENDER_OPTIONS}
            placeholder="Opcional"
          />
        </div>

        <Button onClick={handleSaveProfile} loading={profileLoading}>
          Guardar perfil
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-border">
        <button
          type="button"
          onClick={() => setAiOpen(!aiOpen)}
          className="w-full flex items-center justify-between p-6"
        >
          <div className="text-left">
            <h2 className="font-semibold">Asesor IA</h2>
            <p className="text-sm text-muted">Personaliza el comportamiento del asesor financiero</p>
          </div>
          <ChevronDown
            size={20}
            className={`text-muted transition-transform ${aiOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {aiOpen && (
          <div className="px-6 pb-6 space-y-4 border-t border-border pt-4">
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

            <Button onClick={handleSaveAI} loading={loading}>
              Guardar configuración
            </Button>
          </div>
        )}
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
        title="Cerrar sesión"
        message="¿Seguro que deseas cerrar tu sesión?"
        confirmLabel="Cerrar sesión"
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
