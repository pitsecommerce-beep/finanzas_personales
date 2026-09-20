'use client'

import { useState } from 'react'
import { Plus, Trash2, Pencil, CheckSquare, X } from 'lucide-react'
import { useIncome } from '@/lib/hooks/use-income'
import { useTransactions } from '@/lib/hooks/use-transactions'
import { TransactionList } from '@/components/transactions/transaction-list'
import { TransactionForm } from '@/components/transactions/transaction-form'
import { IncomeForm } from '@/components/income/income-form'
import { Modal } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { formatMXN } from '@/lib/utils/currency'
import type { IncomeSource, Transaction } from '@/types/database'

const FREQ_LABELS: Record<string, string> = {
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
}

const TYPE_LABELS: Record<string, string> = {
  salary: 'Salario',
  freelance: 'Freelance',
  business: 'Negocio',
  investment: 'Inversión',
  rental: 'Renta',
  other: 'Otro',
}

export default function IngresosPage() {
  const { sources, loading: sourcesLoading, deleteSource, refetch: refetchSources } = useIncome()
  const { transactions, loading: txLoading, deleteTransaction, deleteTransactions, refetch: refetchTx } = useTransactions({ type: 'income' })
  const [showIncomeForm, setShowIncomeForm] = useState(false)
  const [editingSource, setEditingSource] = useState<IncomeSource | null>(null)
  const [showTxForm, setShowTxForm] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; kind: 'source' | 'tx' } | null>(null)
  const [selectable, setSelectable] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBulkDelete, setShowBulkDelete] = useState(false)
  const { toast } = useToast()

  async function confirmDelete() {
    if (!deleteTarget) return
    if (deleteTarget.kind === 'source') {
      await deleteSource(deleteTarget.id)
    } else {
      await deleteTransaction(deleteTarget.id)
    }
    toast('Eliminado', 'success')
    setDeleteTarget(null)
  }

  async function confirmBulkDelete() {
    const ids = Array.from(selectedIds)
    const { error } = await deleteTransactions(ids)
    if (error) toast('Error al eliminar', 'error')
    else toast(`${ids.length} ingresos eliminados`, 'success')
    setShowBulkDelete(false)
    setSelectedIds(new Set())
    setSelectable(false)
  }

  function selectAll() {
    setSelectedIds(new Set(transactions.map(t => t.id)))
  }

  function cancelSelection() {
    setSelectable(false)
    setSelectedIds(new Set())
  }

  const loading = sourcesLoading || txLoading

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
        <h1 className="text-2xl font-bold">Ingresos</h1>
        <div className="flex gap-2">
          {!selectable ? (
            <>
              {transactions.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => setSelectable(true)}>
                  <CheckSquare size={14} /> Seleccionar
                </Button>
              )}
              <Button onClick={() => setShowIncomeForm(true)} size="sm" variant="outline">
                <Plus size={16} /> Fuente
              </Button>
              <Button onClick={() => setShowTxForm(true)} size="sm">
                <Plus size={16} /> Ingreso
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={selectAll}>
                Todos ({transactions.length})
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

      {sources.length > 0 && (
        <div>
          <h2 className="font-semibold text-sm mb-3">Fuentes de ingreso</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {sources.map((s) => (
              <div key={s.id} className="bg-white rounded-xl border border-border p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 text-success flex items-center justify-center text-lg">
                  💼
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{s.description}</p>
                  <p className="text-xs text-muted">
                    {TYPE_LABELS[s.income_type] ?? 'Otro'} · {FREQ_LABELS[s.frequency] ?? s.frequency}
                    {s.card && ` · ${s.card.alias}`}
                  </p>
                </div>
                <p className="font-semibold text-success text-sm">{formatMXN(s.amount)}</p>
                <button
                  onClick={() => setEditingSource(s)}
                  className="text-muted hover:text-accent p-1"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => setDeleteTarget({ id: s.id, kind: 'source' })}
                  className="text-muted hover:text-danger p-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="font-semibold text-sm mb-3">Historial de ingresos</h2>
        <TransactionList
          transactions={transactions}
          onEdit={selectable ? undefined : (tx) => setEditingTx(tx)}
          onDelete={selectable ? undefined : (id) => setDeleteTarget({ id, kind: 'tx' })}
          selectable={selectable}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      </div>

      <Modal open={showIncomeForm} onClose={() => setShowIncomeForm(false)} title="Nueva fuente de ingreso">
        <IncomeForm onSuccess={() => { setShowIncomeForm(false); refetchSources() }} />
      </Modal>

      <Modal open={!!editingSource} onClose={() => setEditingSource(null)} title="Editar fuente de ingreso">
        {editingSource && (
          <IncomeForm source={editingSource} onSuccess={() => { setEditingSource(null); refetchSources() }} />
        )}
      </Modal>

      <Modal open={showTxForm} onClose={() => setShowTxForm(false)} title="Registrar ingreso">
        <TransactionForm type="income" onSuccess={() => { setShowTxForm(false); refetchTx() }} />
      </Modal>

      <Modal open={!!editingTx} onClose={() => setEditingTx(null)} title="Editar ingreso">
        {editingTx && (
          <TransactionForm type="income" transaction={editingTx} onSuccess={() => { setEditingTx(null); refetchTx() }} />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Eliminar registro"
        message="Esta accion no se puede deshacer. ¿Deseas continuar?"
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={showBulkDelete}
        title={`Eliminar ${selectedIds.size} ingresos`}
        message={`Se eliminaran ${selectedIds.size} ingresos. Esta accion no se puede deshacer.`}
        confirmLabel="Eliminar todos"
        onConfirm={confirmBulkDelete}
        onCancel={() => setShowBulkDelete(false)}
      />
    </div>
  )
}
