'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function OnboardingPage() {
  const [fullName, setFullName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) { setError('Tu nombre es obligatorio'); return }

    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Sesión no válida'); setLoading(false); return }

    const { error: dbError } = await supabase
      .from('profiles')
      .upsert({
        user_id: user.id,
        full_name: fullName.trim(),
        birth_date: birthDate || null,
        gender: gender || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    setLoading(false)
    if (dbError) {
      setError('Error al guardar tu perfil')
      return
    }

    router.push('/inicio')
    router.refresh()
  }

  const genderOptions = [
    { value: 'male', label: 'Masculino' },
    { value: 'female', label: 'Femenino' },
    { value: 'other', label: 'Otro' },
    { value: 'prefer_not_to_say', label: 'Prefiero no decir' },
  ]

  return (
    <div className="bg-secondary rounded-2xl p-6 space-y-5">
      <div className="text-center">
        <p className="text-3xl mb-2">👋</p>
        <h2 className="text-xl font-semibold text-white">Cuéntanos sobre ti</h2>
        <p className="text-gray-400 text-sm mt-1">Para personalizar tu experiencia</p>
      </div>

      {error && (
        <div className="bg-danger/10 text-danger text-sm rounded-lg px-3 py-2">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="full_name"
          label="Tu nombre"
          labelClassName="text-gray-300"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Nombre completo"
          required
          className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
        />

        <Input
          id="birth_date"
          label="Fecha de nacimiento"
          labelClassName="text-gray-300"
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
        />

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-300">Género</label>
          <div className="grid grid-cols-2 gap-2">
            {genderOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setGender(opt.value)}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition ${
                  gender === opt.value
                    ? 'bg-accent/20 text-accent border border-accent/30'
                    : 'bg-white/5 text-gray-400 border border-white/10 hover:border-white/20'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <Button type="submit" loading={loading} className="w-full" size="lg">
          Continuar
        </Button>
      </form>
    </div>
  )
}
