'use client'

import { Transaction } from '@/types/database'
import { getCategoryEmoji, getCategoryLabel } from '@/lib/constants/categories'
import { formatMXN } from '@/lib/utils/currency'
import { formatShortDate } from '@/lib/utils/dates'
import { Trash2, Pencil } from 'lucide-react'

interface TransactionListProps {
  transactions: Transaction[]
  onEdit?: (transaction: Transaction) => void
  onDelete?: (id: string) => void
  showType?: boolean
  selectable?: boolean
  selectedIds?: Set<string>
  onSelectionChange?: (ids: Set<string>) => void
}

function transferLabel(t: Transaction): string {
  const from = t.transfer_from_card?.alias ?? 'Cuenta'
  const to = t.transfer_to_card?.alias ?? 'Cuenta'
  if (t.category === 'pago_credito') return `Pago a ${to}`
  return `Traspaso de ${from} a ${to}`
}

export function TransactionList({ transactions, onEdit, onDelete, showType = false, selectable, selectedIds, onSelectionChange }: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-muted">
        <p className="text-4xl mb-2">📋</p>
        <p className="text-sm">No hay movimientos registrados</p>
      </div>
    )
  }

  function toggleSelection(id: string) {
    if (!onSelectionChange || !selectedIds) return
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onSelectionChange(next)
  }

  const grouped = transactions.reduce<Record<string, Transaction[]>>((acc, t) => {
    const key = t.date
    if (!acc[key]) acc[key] = []
    acc[key].push(t)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([date, items]) => (
        <div key={date}>
          <p className="text-xs font-medium text-muted mb-2">{formatShortDate(date)}</p>
          <div className="bg-white rounded-xl border border-border divide-y divide-border">
            {items.map((t) => {
              const isTransfer = t.is_transfer
              return (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                  {selectable && (
                    <input
                      type="checkbox"
                      checked={selectedIds?.has(t.id) ?? false}
                      onChange={() => toggleSelection(t.id)}
                      className="w-4 h-4 rounded border-border text-accent focus:ring-accent/50 shrink-0"
                    />
                  )}
                  <span className="text-xl">{getCategoryEmoji(t.category)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {isTransfer ? transferLabel(t) : t.description}
                    </p>
                    <p className="text-xs text-muted">
                      {getCategoryLabel(t.category)}
                      {!isTransfer && t.card && ` · ${t.card.alias}`}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-semibold whitespace-nowrap ${
                      isTransfer ? 'text-blue-600' : t.type === 'expense' ? 'text-danger' : 'text-success'
                    }`}
                  >
                    {isTransfer ? '' : t.type === 'expense' ? '-' : '+'}{formatMXN(t.amount)}
                  </span>
                  {onEdit && !selectable && (
                    <button
                      onClick={() => onEdit(t)}
                      className="text-muted hover:text-accent p-1"
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                  {onDelete && !selectable && (
                    <button
                      onClick={() => onDelete(t.id)}
                      className="text-muted hover:text-danger p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
