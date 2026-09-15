'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function RegistroPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    setLoading(false)

    if (authError) {
      setError(authError.message)
      return
    }

    setSuccess(true)
  }

  if (success) {
    return (
      <div className="bg-secondary rounded-2xl p-6 text-center space-y-4">
        <div className="text-4xl">📧</div>
        <h2 className="text-xl font-semibold text-white">Revisa tu correo</h2>
        <p className="text-gray-400 text-sm">
          Te enviamos un enlace de confirmación a <strong className="text-white">{email}</strong>
        </p>
        <Link href="/login" className="text-accent text-sm hover:underline block">
          Volver a iniciar sesión
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-secondary rounded-2xl p-6 space-y-4">
      <h2 className="text-xl font-semibold text-white text-center">Crear cuenta</h2>

      {error && (
        <div className="bg-danger/10 text-danger text-sm rounded-lg px-3 py-2">{error}</div>
      )}

      <Input
        id="email"
        label="Correo electrónico"
        labelClassName="text-gray-300"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="tu@correo.com"
        required
        className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
      />

      <Input
        id="password"
        label="Contraseña"
        labelClassName="text-gray-300"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Mínimo 6 caracteres"
        required
        className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
      />

      <Input
        id="confirm-password"
        label="Confirmar contraseña"
        labelClassName="text-gray-300"
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="Repite tu contraseña"
        required
        className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
      />

      <Button type="submit" loading={loading} className="w-full" size="lg">
        Crear cuenta
      </Button>

      <p className="text-center text-sm text-gray-400">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="text-accent hover:underline">
          Inicia sesión
        </Link>
      </p>
    </form>
  )
}
