'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError('Correo o contraseña incorrectos')
      setLoading(false)
      return
    }

    router.push('/inicio')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-secondary rounded-2xl p-6 space-y-4">
      <h2 className="text-xl font-semibold text-white text-center">Iniciar sesión</h2>

      {error && (
        <div className="bg-danger/10 text-danger text-sm rounded-lg px-3 py-2">{error}</div>
      )}

      <Input
        id="email"
        label="Correo electrónico"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="tu@correo.com"
        required
        className="bg-white/10 border-white/20 text-white placeholder:text-gray-500"
      />

      <Input
        id="password"
        label="Contraseña"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Tu contraseña"
        required
        className="bg-white/10 border-white/20 text-white placeholder:text-gray-500"
      />

      <Button type="submit" loading={loading} className="w-full" size="lg">
        Iniciar sesión
      </Button>

      <p className="text-center text-sm text-gray-400">
        ¿No tienes cuenta?{' '}
        <Link href="/registro" className="text-accent hover:underline">
          Regístrate
        </Link>
      </p>
    </form>
  )
}
