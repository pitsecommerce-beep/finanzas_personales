'use client'

import { useRouter } from 'next/navigation'
import { TransactionForm } from '@/components/transactions/transaction-form'

export default function NuevoIngresoPage() {
  const router = useRouter()

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Nuevo ingreso</h1>
      <TransactionForm type="income" onSuccess={() => router.push('/ingresos')} />
    </div>
  )
}
