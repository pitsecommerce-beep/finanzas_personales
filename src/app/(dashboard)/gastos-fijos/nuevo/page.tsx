'use client'

import { useRouter } from 'next/navigation'
import { FixedExpenseForm } from '@/components/fixed-expenses/fixed-expense-form'

export default function NuevoGastoFijoPage() {
  const router = useRouter()

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Nuevo gasto fijo (MSI)</h1>
      <FixedExpenseForm onSuccess={() => router.push('/gastos-fijos')} />
    </div>
  )
}
