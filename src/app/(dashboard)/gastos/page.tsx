'use client'

import { useState } from 'react'
import { Plus, CheckSquare, X, Trash2 } from 'lucide-react'
import { useLedger } from '@/lib/data/ledger'
import { TransactionList } from '@/components/transactions/transaction-list'
import { TransactionForm } from '@/components/transactions/transaction-form'
import { Modal } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import type { LedgerEntry } from '@/types/database'

export default function GastosPage() {
  const { entries, loading, softDeleteEntry, softDeleteEntries, refetch } = useLedger()
  const expenses = entries.filter(e => e.entry_type === 'expense')
  const [showForm, setShowForm] = useState(false)
  const [editingTx, setEditingTx] = useState<LedgerEntry | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [selectable, setSelectable] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBulkDelete, setShowBulkDelete] = useState(false)
  const { toast } = useToast()

  async function confirmDelete() {
    if (!deleteId) return
    const { error } = await softDeleteEntry(deleteId)
    if (error) toast('Error al eliminar', 'error')
    else toast('Gasto eliminado', 'success')
    setDeleteId(null)
  }

  async function confirmBulkDelete() {
    const ids = Array.from(selectedIds)
    const { error } = await softDeleteEntries(ids)
    if (error) toast('Error al eliminar', 'error')
    else toast(`${ids.length} gastos eliminados`, 'success')
    setShowBulkDelete(false)
    setSelectedIds(new Set())
    setSelectable(false)
  }

  function selectAll() {
    setSelectedIds(new Set(expenses.map(e => e.id)))
  }

  function cancelSelection() {
    setSelectable(false)
    setSelectedIds(new Set())
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
          <p className="text-sm text-muted">{expenses.length} gastos registrados</p>
        </div>
        <div className="flex gap-2">
          {!selectable ? (
            <>
              {expenses.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => setSelectable(true)}>
                  <CheckSquare size={14} /> Seleccionar
                </Button>
              )}
              <Button onClick={() => setShowForm(true)} size="sm">
                <Plus size={16} /> Nuevo gasto
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={selectAll}>
                Todos ({expenses.length})
              </Button>
              <Button variant="outline" size="sm" onClick={cancelSelection}>
                <X size={14} /> Cancelar
              </Button>
              {selectedIds.size > 0 && (
                <Button variant="danger" size="sm" onClick={() => setShowBulkDelete(true)}>
                  <Trash2 size={14} /> Eliminar ({selectedIds.size})
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <TransactionList
        entries={expenses}
        onEdit={selectable ? undefined : (e) => setEditingTx(e)}
        onDelete={selectable ? undefined : (id) => setDeleteId(id)}
        selectable={selectable}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nuevo gasto">
        <TransactionForm type="expense" onSuccess={() => { setShowForm(false); refetch() }} />
      </Modal>

      <Modal open={!!editingTx} onClose={() => setEditingTx(null)} title="Editar gasto">
        {editingTx && (
          <TransactionForm type="expense" entry={editingTx} onSuccess={() => { setEditingTx(null); refetch() }} />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Eliminar gasto"
        message="Esta acción no se puede deshacer. ¿Deseas continuar?"
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />

      <ConfirmDialog
        open={showBulkDelete}
        title={`Eliminar ${selectedIds.size} gastos`}
        message={`Se eliminarán ${selectedIds.size} gastos. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar todos"
        onConfirm={confirmBulkDelete}
        onCancel={() => setShowBulkDelete(false)}
      />
    </div>
  )
}
