'use client'

import { useEffect, useState } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/components/ui/toast'
import { ChevronDown, Smartphone, Copy, Trash2, Plus, Check } from 'lucide-react'

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
  const [model, setModel] = useState('claude-sonnet-4-6')
  const [aiOpen, setAiOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [loadingData, setLoadingData] = useState(true)
  const [showLogout, setShowLogout] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [tokens, setTokens] = useState<Array<{ id: string; token: string; label: string; is_active: boolean; created_at: string }>>([])
  const [tokensLoading, setTokensLoading] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [testingToken, setTestingToken] = useState(false)
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

  async function loadTokens() {
    setTokensLoading(true)
    try {
      const res = await fetch('/api/shortcuts/token')
      const data = await res.json()
      setTokens(data.tokens ?? [])
    } catch {
      toast('Error al cargar tokens', 'error')
    }
    setTokensLoading(false)
  }

  async function createToken() {
    try {
      const res = await fetch('/api/shortcuts/token', { method: 'POST' })
      const data = await res.json()
      if (data.token) {
        setTokens(prev => [data.token, ...prev])
        toast('Token creado', 'success')
      } else {
        toast(data.error || 'Error al crear token', 'error')
      }
    } catch {
      toast('Error al crear token', 'error')
    }
  }

  async function deleteToken(id: string) {
    try {
      await fetch('/api/shortcuts/token', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      setTokens(prev => prev.filter(t => t.id !== id))
      toast('Token eliminado', 'success')
    } catch {
      toast('Error al eliminar', 'error')
    }
  }

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const apiUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/shortcuts/expense`
    : ''

  function copyFullConfig(token: string) {
    const config = [
      `URL: ${apiUrl}`,
      `Metodo: POST`,
      ``,
      `Encabezados:`,
      `  Authorization: Bearer ${token}`,
      `  Content-Type: application/json`,
      ``,
      `Cuerpo (JSON):`,
      `{`,
      `  "amount": [Monto de la transaccion],`,
      `  "merchant": "[Nombre del comercio]"`,
      `}`,
    ].join('\n')
    navigator.clipboard.writeText(config)
    setCopiedField('full')
    setTimeout(() => setCopiedField(null), 3000)
    toast('Configuracion copiada al portapapeles', 'success')
  }

  async function testToken(token: string) {
    setTestingToken(true)
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: 0.01, merchant: 'Prueba Nummo' }),
      })
      const data = await res.json()
      if (res.ok) {
        toast('Conexion exitosa. Revisa tus gastos para ver la prueba.', 'success')
      } else {
        toast(data.error || 'Error de conexion', 'error')
      }
    } catch {
      toast('No se pudo conectar al servidor', 'error')
    }
    setTestingToken(false)
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
                <option value="claude-sonnet-4-6">Claude Sonnet 4</option>
                <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5</option>
              </select>
            </div>

            <Button onClick={handleSaveAI} loading={loading}>
              Guardar configuración
            </Button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-border">
        <button
          type="button"
          onClick={() => {
            setShortcutsOpen(!shortcutsOpen)
            if (!shortcutsOpen && tokens.length === 0) loadTokens()
          }}
          className="w-full flex items-center justify-between p-6"
        >
          <div className="text-left flex items-center gap-3">
            <Smartphone size={20} className="text-accent" />
            <div>
              <h2 className="font-semibold">Apple Shortcuts</h2>
              <p className="text-sm text-muted">Registra gastos desde tu iPhone de forma automática</p>
            </div>
          </div>
          <ChevronDown
            size={20}
            className={`text-muted transition-transform ${shortcutsOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {shortcutsOpen && (
          <div className="px-6 pb-6 space-y-5 border-t border-border pt-4">
            {tokensLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin h-5 w-5 border-2 border-accent border-t-transparent rounded-full" />
              </div>
            ) : tokens.length === 0 ? (
              <div className="text-center py-4 space-y-3">
                <p className="text-sm text-muted">Crea un token para conectar tu iPhone con Nummo</p>
                <Button onClick={createToken}>
                  <Plus size={14} /> Generar token de acceso
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted uppercase tracking-wide">Pasos en la app Atajos</p>

                  <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 space-y-2">
                    <p className="text-sm font-medium">1. Crear la automatizacion</p>
                    <p className="text-xs text-muted">
                      Atajos &gt; Automatizacion &gt; <strong>+</strong> &gt; busca <strong>&quot;Transaccion&quot;</strong> &gt; selecciona <strong>&quot;Se completa una transaccion&quot;</strong>
                    </p>
                  </div>

                  <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 space-y-3">
                    <p className="text-sm font-medium">2. Agregar la accion &quot;Obtener contenido de la URL&quot;</p>

                    <CopyField
                      label="URL"
                      value={apiUrl}
                      copied={copiedField === 'url'}
                      onCopy={() => copyToClipboard(apiUrl, 'url')}
                    />

                    <p className="text-xs text-muted">Cambia el metodo a <strong>POST</strong></p>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 space-y-1">
                      <p className="text-xs font-medium text-amber-800">Encabezados (Headers)</p>
                      <p className="text-xs text-amber-700">
                        Toca <strong>&quot;Encabezados&quot;</strong> para expandir la seccion. Agrega un nuevo encabezado:
                      </p>
                    </div>

                    <CopyField
                      label="Clave del encabezado"
                      value="Authorization"
                      copied={copiedField === 'hkey'}
                      onCopy={() => copyToClipboard('Authorization', 'hkey')}
                    />

                    <CopyField
                      label="Valor del encabezado"
                      value={`Bearer ${tokens[0].token}`}
                      copied={copiedField === 'auth'}
                      onCopy={() => copyToClipboard(`Bearer ${tokens[0].token}`, 'auth')}
                    />
                  </div>

                  <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 space-y-3">
                    <p className="text-sm font-medium">3. Configurar el cuerpo JSON</p>
                    <p className="text-xs text-muted">
                      Toca <strong>&quot;Cuerpo de la solicitud&quot;</strong> y cambialo a <strong>&quot;JSON&quot;</strong>. Agrega estos campos:
                    </p>

                    <CopyField
                      label="Clave 1"
                      value="amount"
                      copied={copiedField === 'k1'}
                      onCopy={() => copyToClipboard('amount', 'k1')}
                    />
                    <p className="text-xs text-muted -mt-1">
                      Valor: toca el campo, selecciona <strong>&quot;Variable magica&quot;</strong> &gt; <strong>&quot;Monto&quot;</strong> (de la transaccion)
                    </p>

                    <CopyField
                      label="Clave 2"
                      value="merchant"
                      copied={copiedField === 'k2'}
                      onCopy={() => copyToClipboard('merchant', 'k2')}
                    />
                    <p className="text-xs text-muted -mt-1">
                      Valor: variable magica <strong>&quot;Comercio&quot;</strong>. Si no aparece, escribe el nombre del comercio manualmente.
                    </p>

                    <CopyField
                      label="Clave 3 (opcional)"
                      value="card"
                      copied={copiedField === 'k3'}
                      onCopy={() => copyToClipboard('card', 'k3')}
                    />
                    <p className="text-xs text-muted -mt-1">
                      Valor: variable magica <strong>&quot;Tarjeta&quot;</strong> (se empareja con tus tarjetas en Nummo por nombre o ultimos 4 digitos)
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyFullConfig(tokens[0].token)}
                    className="flex-1"
                  >
                    {copiedField === 'full' ? <Check size={14} /> : <Copy size={14} />}
                    {copiedField === 'full' ? 'Copiado' : 'Copiar todo'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => testToken(tokens[0].token)}
                    loading={testingToken}
                    className="flex-1"
                  >
                    Probar conexion
                  </Button>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700">
                  Los gastos se categorizan con IA de forma automatica. Si necesitas ajustar algo, editalo desde la app.
                </div>

                <div className="border-t border-border pt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted">Tokens activos</p>
                    <Button size="sm" variant="outline" onClick={createToken}>
                      <Plus size={12} /> Nuevo
                    </Button>
                  </div>
                  {tokens.map(t => (
                    <div key={t.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5">
                      <code className="text-[10px] flex-1 truncate text-muted">{t.token.slice(0, 20)}...</code>
                      <button
                        onClick={() => copyToClipboard(t.token, t.id)}
                        className="text-muted hover:text-accent p-1"
                      >
                        {copiedField === t.id ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                      </button>
                      <button
                        onClick={() => deleteToken(t.id)}
                        className="text-muted hover:text-danger p-1"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
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

function CopyField({ label, value, copied, onCopy }: { label: string; value: string; copied: boolean; onCopy: () => void }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] text-muted font-medium uppercase tracking-wide">{label}</p>
      <button
        type="button"
        onClick={onCopy}
        className="w-full flex items-center gap-2 bg-white border border-border rounded-lg px-3 py-2 text-left hover:border-accent transition-colors group"
      >
        <code className="text-xs flex-1 truncate text-foreground">{value}</code>
        {copied ? <Check size={14} className="shrink-0 text-success" /> : <Copy size={14} className="shrink-0 text-muted group-hover:text-accent" />}
      </button>
    </div>
  )
}
