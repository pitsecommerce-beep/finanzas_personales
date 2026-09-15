'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useTransactions } from '@/lib/hooks/use-transactions'
import { TransactionList } from '@/components/transactions/transaction-list'
import { TransactionForm } from '@/components/transactions/transaction-form'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'

export default function GastosPage() {
  const { transactions, loading, deleteTransaction, refetch } = useTransactions({ type: 'expense' })
  const [showForm, setShowForm] = useState(false)
  const { toast } = useToast()

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este gasto?')) return
    const { error } = await deleteTransaction(id)
    if (error) toast('Error al eliminar', 'error')
    else toast('Gasto eliminado', 'success')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gastos</h1>
          <p className="text-sm text-muted">{transactions.length} gastos registrados</p>
        </div>
        <Button onClick={() => setShowForm(true)} size="sm">
          <Plus size={16} /> Nuevo gasto
        </Button>
      </div>

      <TransactionList transactions={transactions} onDelete={handleDelete} />

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nuevo gasto">
        <TransactionForm type="expense" onSuccess={() => { setShowForm(false); refetch() }} />
      </Modal>
    </div>
  )
}
