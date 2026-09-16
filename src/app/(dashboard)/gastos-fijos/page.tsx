'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useFixedExpenses } from '@/lib/hooks/use-fixed-expenses'
import { FixedExpenseList } from '@/components/fixed-expenses/fixed-expense-list'
import { FixedExpenseForm } from '@/components/fixed-expenses/fixed-expense-form'
import { Modal } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { formatMXN } from '@/lib/utils/currency'
import { getRemainingMonths } from '@/lib/utils/dates'

export default function GastosFijosPage() {
  const { expenses, loading, deleteExpense, refetch } = useFixedExpenses()
  const [showForm, setShowForm] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { toast } = useToast()

  const activeExpenses = expenses.filter((e) => e.status === 'active')
  const totalMonthly = activeExpenses.reduce((sum, e) => {
    const isMsi = e.is_msi !== false && e.total_months > 1
    if (isMsi) {
      const remaining = getRemainingMonths(e.start_date, e.total_months)
      return sum + (remaining > 0 ? Number(e.monthly_amount) : 0)
    }
    const now = new Date()
    const start = new Date(e.start_date)
    if (start > now) return sum
    if (e.end_date && new Date(e.end_date) < now) return sum
    return sum + Number(e.monthly_amount)
  }, 0)

  async function handleDelete(id: string) {
    setDeleteId(id)
  }

  async function confirmDelete() {
    if (!deleteId) return
    const { error } = await deleteExpense(deleteId)
    if (error) toast('Error al eliminar', 'error')
    else toast('Gasto fijo eliminado', 'success')
    setDeleteId(null)
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
          <h1 className="text-2xl font-bold">Gastos fijos</h1>
          <p className="text-sm text-muted">MSI y gastos mensuales recurrentes</p>
        </div>
        <Button onClick={() => setShowForm(true)} size="sm">
          <Plus size={16} /> Agregar
        </Button>
      </div>

      {totalMonthly > 0 && (
        <div className="bg-accent/10 border border-accent/20 rounded-xl p-4">
          <p className="text-xs text-muted mb-1">Total mensual en compromisos fijos</p>
          <p className="text-2xl font-bold text-accent">{formatMXN(totalMonthly)}</p>
        </div>
      )}

      <FixedExpenseList expenses={expenses} onDelete={handleDelete} />

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nuevo gasto fijo">
        <FixedExpenseForm onSuccess={() => { setShowForm(false); refetch() }} />
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Eliminar gasto fijo"
        message="Esta acción no se puede deshacer. ¿Deseas continuar?"
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
