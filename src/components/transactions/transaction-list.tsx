'use client'

import { formatMXN } from '@/lib/utils/currency'
import { formatShortDate } from '@/lib/utils/dates'
import { Trash2, Pencil } from 'lucide-react'
import type { LedgerEntry } from '@/types/database'

interface TransactionListProps {
  entries: LedgerEntry[]
  onEdit?: (entry: LedgerEntry) => void
  onDelete?: (id: string) => void
  showType?: boolean
  selectable?: boolean
  selectedIds?: Set<string>
  onSelectionChange?: (ids: Set<string>) => void
}

export function TransactionList({ entries, onEdit, onDelete, showType = false, selectable, selectedIds, onSelectionChange }: TransactionListProps) {
  if (entries.length === 0) {
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

  const grouped = entries.reduce<Record<string, LedgerEntry[]>>((acc, e) => {
    const key = e.occurred_on
    if (!acc[key]) acc[key] = []
    acc[key].push(e)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([date, items]) => (
        <div key={date}>
          <p className="text-xs font-medium text-muted mb-2">{formatShortDate(date)}</p>
          <div className="bg-white rounded-xl border border-border divide-y divide-border">
            {items.map((e) => {
              const isTransfer = e.entry_type === 'transfer'
              const emoji = e.category?.emoji ?? '📦'
              const catLabel = e.category?.label ?? 'Otros'
              const accountLabel = e.account?.alias

              return (
                <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                  {selectable && (
                    <input
                      type="checkbox"
                      checked={selectedIds?.has(e.id) ?? false}
                      onChange={() => toggleSelection(e.id)}
                      className="w-4 h-4 rounded border-border text-accent focus:ring-accent/50 shrink-0"
                    />
                  )}
                  <span className="text-xl">{emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{e.description}</p>
                    <p className="text-xs text-muted">
                      {catLabel}
                      {!isTransfer && accountLabel && ` · ${accountLabel}`}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-semibold whitespace-nowrap ${
                      isTransfer ? 'text-blue-600'
                      : e.entry_type === 'expense' ? 'text-danger'
                      : e.entry_type === 'income' ? 'text-success'
                      : 'text-muted'
                    }`}
                  >
                    {e.amount > 0 ? '+' : ''}{formatMXN(Math.abs(Number(e.amount)))}
                  </span>
                  {onEdit && !selectable && (
                    <button onClick={() => onEdit(e)} className="text-muted hover:text-accent p-1">
                      <Pencil size={14} />
                    </button>
                  )}
                  {onDelete && !selectable && (
                    <button onClick={() => onDelete(e.id)} className="text-muted hover:text-danger p-1">
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
