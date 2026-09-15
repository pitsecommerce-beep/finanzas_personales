'use client'

import { useRouter } from 'next/navigation'
import { CardForm } from '@/components/cards/card-form'

export default function NuevaTarjetaPage() {
  const router = useRouter()

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Nueva tarjeta</h1>
      <CardForm onSuccess={() => router.push('/tarjetas')} />
    </div>
  )
}
