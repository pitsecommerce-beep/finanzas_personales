'use client'

import { useRouter } from 'next/navigation'
import { TransactionForm } from '@/components/transactions/transaction-form'

export default function NuevoGastoPage() {
  const router = useRouter()

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Nuevo gasto</h1>
      <TransactionForm type="expense" onSuccess={() => router.push('/gastos')} />
    </div>
  )
}
