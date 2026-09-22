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
  const [shortcutsTab, setShortcutsTab] = useState<'manual' | 'auto'>('manual')
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
          supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
          supabase.from('ai_config').select('*').eq('user_id', user.id).maybeSingle(),
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
        toast('Conexión exitosa. Revisa tus gastos para ver la prueba.', 'success')
      } else {
        toast(data.error || 'Error de conexión', 'error')
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
                <div className="flex rounded-lg border border-border overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShortcutsTab('manual')}
                    className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${shortcutsTab === 'manual' ? 'bg-accent text-white' : 'bg-gray-50 text-muted hover:text-foreground'}`}
                  >
                    Atajo manual (recomendado)
                  </button>
                  <button
                    type="button"
                    onClick={() => setShortcutsTab('auto')}
                    className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${shortcutsTab === 'auto' ? 'bg-accent text-white' : 'bg-gray-50 text-muted hover:text-foreground'}`}
                  >
                    Automático (Apple Pay)
                  </button>
                </div>

                {shortcutsTab === 'manual' ? (
                  <div className="space-y-3">
                    <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700">
                      Funciona con cualquier compra. Creas un atajo que te pide monto y comercio, y lo ejecutas cuando quieras.
                    </div>

                    <StepCard number="1" title="Crear un atajo nuevo">
                      <p>Abre la app <strong>Atajos</strong> &gt; pestaña <strong>Atajos</strong> &gt; toca <strong>+</strong> (arriba a la derecha) &gt; ponle nombre <strong>&quot;Registrar gasto&quot;</strong></p>
                    </StepCard>

                    <StepCard number="2" title='Agregar 2 acciones "Solicitar entrada"'>
                      <p>Busca <strong>&quot;Solicitar entrada&quot;</strong> en la barra de búsqueda de acciones y agrégala <strong>dos veces</strong>:</p>
                      <ConfigRow label="Acción 1" field="Pregunta" value='"¿Cuánto gastaste?"' extra='Tipo de entrada: Número' />
                      <ConfigRow label="Acción 2" field="Pregunta" value='"¿En dónde compraste?"' extra='Tipo de entrada: Texto' />
                    </StepCard>

                    <StepCard number="3" title='Agregar "Obtener contenido de la URL"'>
                      <p>Busca <strong>&quot;Obtener contenido de&quot;</strong> y agrega la accion <strong>&quot;Obtener contenido de la URL&quot;</strong>.</p>

                      <div className="mt-2 space-y-2">
                        <p className="text-[10px] font-semibold text-accent uppercase tracking-wide">URL</p>
                        <p>Pega esta URL en el campo de URL de la acción:</p>
                      </div>
                      <CopyField label="URL" value={apiUrl} copied={copiedField === 'murl'} onCopy={() => copyToClipboard(apiUrl, 'murl')} />

                      <div className="mt-3 space-y-2">
                        <p className="text-[10px] font-semibold text-accent uppercase tracking-wide">Método</p>
                        <p>Toca donde dice <strong>&quot;GET&quot;</strong> y cámbialo a <strong>&quot;POST&quot;</strong></p>
                      </div>

                      <div className="mt-3 space-y-2">
                        <p className="text-[10px] font-semibold text-accent uppercase tracking-wide">Encabezados</p>
                        <p>Toca <strong>&quot;Encabezados&quot;</strong> para expandirlo. Agrega <strong>un encabezado</strong> con estos valores:</p>
                      </div>
                      <CopyField label="Clave del encabezado" value="Authorization" copied={copiedField === 'mkey'} onCopy={() => copyToClipboard('Authorization', 'mkey')} />
                      <CopyField label="Valor del encabezado" value={`Bearer ${tokens[0].token}`} copied={copiedField === 'mauth'} onCopy={() => copyToClipboard(`Bearer ${tokens[0].token}`, 'mauth')} />

                      <div className="mt-3 space-y-2">
                        <p className="text-[10px] font-semibold text-accent uppercase tracking-wide">Cuerpo de la solicitud</p>
                        <p>Toca <strong>&quot;Cuerpo de la solicitud&quot;</strong> y cambia el tipo de <strong>&quot;Formulario&quot;</strong> a <strong>&quot;JSON&quot;</strong>. Agrega <strong>dos campos</strong>:</p>
                      </div>

                      <div className="bg-white border border-border rounded-lg overflow-hidden mt-1">
                        <div className="grid grid-cols-3 text-[10px] font-semibold text-muted uppercase bg-gray-50 border-b border-border">
                          <div className="px-2 py-1.5">Clave</div>
                          <div className="px-2 py-1.5">Tipo</div>
                          <div className="px-2 py-1.5">Valor</div>
                        </div>
                        <div className="grid grid-cols-3 text-xs border-b border-border items-center">
                          <button type="button" onClick={() => copyToClipboard('amount', 'json-mamount')} className="px-2 py-1.5 font-mono text-left flex items-center gap-1 hover:text-accent transition-colors">
                            amount {copiedField === 'json-mamount' ? <Check size={10} className="text-success" /> : <Copy size={10} className="text-muted" />}
                          </button>
                          <div className="px-2 py-1.5 text-muted">Número</div>
                          <div className="px-2 py-1.5 text-accent font-medium">Entrada proporcionada (del paso &quot;¿Cuánto gastaste?&quot;)</div>
                        </div>
                        <div className="grid grid-cols-3 text-xs items-center">
                          <button type="button" onClick={() => copyToClipboard('merchant', 'json-mmerchant')} className="px-2 py-1.5 font-mono text-left flex items-center gap-1 hover:text-accent transition-colors">
                            merchant {copiedField === 'json-mmerchant' ? <Check size={10} className="text-success" /> : <Copy size={10} className="text-muted" />}
                          </button>
                          <div className="px-2 py-1.5 text-muted">Texto</div>
                          <div className="px-2 py-1.5 text-accent font-medium">Entrada proporcionada (del paso &quot;¿En dónde compraste?&quot;)</div>
                        </div>
                      </div>
                      <p className="text-[10px] text-muted mt-1">Para seleccionar &quot;Entrada proporcionada&quot;: toca el campo de valor, luego toca la variable que aparece arriba del teclado.</p>
                    </StepCard>

                    <StepCard number="4" title="Listo">
                      <p>Ejecútalo después de cada compra. Puedes agregarlo a tu pantalla de inicio o pedirle a Siri: <strong>&quot;Oye Siri, Registrar gasto&quot;</strong>.</p>
                    </StepCard>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
                      <strong>Requisito:</strong> solo funciona si tu tarjeta está en Apple Wallet y los pagos se notifican por ahí. Si no ves logs en Railway cuando pagas, tu banco no soporta este trigger y debes usar el método manual.
                    </div>

                    <StepCard number="1" title="Crear la automatización">
                      <p>Abre <strong>Atajos</strong> &gt; pestaña <strong>Automatización</strong> &gt; toca <strong>+</strong> &gt; busca <strong>&quot;Transacción&quot;</strong> &gt; selecciona <strong>&quot;Se completa una transacción&quot;</strong></p>
                      <p className="mt-1">En la siguiente pantalla selecciona <strong>&quot;Ejecutar inmediatamente&quot;</strong> y desactiva <strong>&quot;Notificar cuando se ejecute&quot;</strong> si quieres que sea invisible.</p>
                    </StepCard>

                    <StepCard number="2" title='Agregar "Obtener contenido de la URL"'>
                      <p>Busca y agrega la acción <strong>&quot;Obtener contenido de la URL&quot;</strong>.</p>

                      <div className="mt-2 space-y-2">
                        <p className="text-[10px] font-semibold text-accent uppercase tracking-wide">URL</p>
                      </div>
                      <CopyField label="URL" value={apiUrl} copied={copiedField === 'aurl'} onCopy={() => copyToClipboard(apiUrl, 'aurl')} />

                      <div className="mt-3 space-y-2">
                        <p className="text-[10px] font-semibold text-accent uppercase tracking-wide">Método</p>
                        <p>Cámbialo a <strong>&quot;POST&quot;</strong></p>
                      </div>

                      <div className="mt-3 space-y-2">
                        <p className="text-[10px] font-semibold text-accent uppercase tracking-wide">Encabezados</p>
                        <p>Expande <strong>&quot;Encabezados&quot;</strong> y agrega uno:</p>
                      </div>
                      <CopyField label="Clave del encabezado" value="Authorization" copied={copiedField === 'akey'} onCopy={() => copyToClipboard('Authorization', 'akey')} />
                      <CopyField label="Valor del encabezado" value={`Bearer ${tokens[0].token}`} copied={copiedField === 'aauth'} onCopy={() => copyToClipboard(`Bearer ${tokens[0].token}`, 'aauth')} />

                      <div className="mt-3 space-y-2">
                        <p className="text-[10px] font-semibold text-accent uppercase tracking-wide">Cuerpo de la solicitud</p>
                        <p>Cambia a <strong>&quot;JSON&quot;</strong> y agrega estos campos:</p>
                      </div>

                      <div className="bg-white border border-border rounded-lg overflow-hidden mt-1">
                        <div className="grid grid-cols-3 text-[10px] font-semibold text-muted uppercase bg-gray-50 border-b border-border">
                          <div className="px-2 py-1.5">Clave</div>
                          <div className="px-2 py-1.5">Tipo</div>
                          <div className="px-2 py-1.5">Valor</div>
                        </div>
                        <div className="grid grid-cols-3 text-xs border-b border-border items-center">
                          <button type="button" onClick={() => copyToClipboard('amount', 'json-aamount')} className="px-2 py-1.5 font-mono text-left flex items-center gap-1 hover:text-accent transition-colors">
                            amount {copiedField === 'json-aamount' ? <Check size={10} className="text-success" /> : <Copy size={10} className="text-muted" />}
                          </button>
                          <div className="px-2 py-1.5 text-muted">Número</div>
                          <div className="px-2 py-1.5 text-accent font-medium">Var. mágica: Monto</div>
                        </div>
                        <div className="grid grid-cols-3 text-xs border-b border-border items-center">
                          <button type="button" onClick={() => copyToClipboard('merchant', 'json-amerchant')} className="px-2 py-1.5 font-mono text-left flex items-center gap-1 hover:text-accent transition-colors">
                            merchant {copiedField === 'json-amerchant' ? <Check size={10} className="text-success" /> : <Copy size={10} className="text-muted" />}
                          </button>
                          <div className="px-2 py-1.5 text-muted">Texto</div>
                          <div className="px-2 py-1.5 text-accent font-medium">Var. mágica: Comercio</div>
                        </div>
                        <div className="grid grid-cols-3 text-xs items-center">
                          <button type="button" onClick={() => copyToClipboard('card', 'json-acard')} className="px-2 py-1.5 font-mono text-left flex items-center gap-1 hover:text-accent transition-colors">
                            card {copiedField === 'json-acard' ? <Check size={10} className="text-success" /> : <Copy size={10} className="text-muted" />}
                          </button>
                          <div className="px-2 py-1.5 text-muted">Texto</div>
                          <div className="px-2 py-1.5 text-accent font-medium">Var. mágica: Tarjeta (opcional)</div>
                        </div>
                      </div>
                      <p className="text-[10px] text-muted mt-1">Las variables mágicas aparecen al tocar el campo de valor. Vienen del trigger &quot;Transacción&quot;.</p>
                    </StepCard>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => testToken(tokens[0].token)}
                    loading={testingToken}
                    className="flex-1"
                  >
                    Probar conexión
                  </Button>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700">
                  Los gastos se categorizan con IA de forma automática. Si necesitas ajustar algo, edítalo desde la app.
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

function StepCard({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 space-y-2">
      <p className="text-sm font-medium">{number}. {title}</p>
      <div className="text-xs text-muted space-y-1">{children}</div>
    </div>
  )
}

function ConfigRow({ label, field, value, extra }: { label: string; field: string; value: string; extra?: string }) {
  return (
    <div className="bg-white border border-border rounded-lg px-3 py-2 mt-1">
      <p className="text-[10px] text-muted uppercase">{label}</p>
      <p className="text-xs"><span className="text-muted">{field}:</span> <strong>{value}</strong></p>
      {extra && <p className="text-[10px] text-muted mt-0.5">{extra}</p>}
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
