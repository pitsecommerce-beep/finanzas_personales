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
}

export function TransactionList({ transactions, onEdit, onDelete, showType = false }: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-muted">
        <p className="text-4xl mb-2">📋</p>
        <p className="text-sm">No hay movimientos registrados</p>
      </div>
    )
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
            {items.map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-xl">{getCategoryEmoji(t.category)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.description}</p>
                  <p className="text-xs text-muted">
                    {getCategoryLabel(t.category)}
                    {t.card && ` · ${t.card.alias}`}
                  </p>
                </div>
                <span
                  className={`text-sm font-semibold whitespace-nowrap ${
                    t.type === 'expense' ? 'text-danger' : 'text-success'
                  }`}
                >
                  {t.type === 'expense' ? '-' : '+'}{formatMXN(t.amount)}
                </span>
                {onEdit && (
                  <button
                    onClick={() => onEdit(t)}
                    className="text-muted hover:text-accent p-1"
                  >
                    <Pencil size={14} />
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => onDelete(t.id)}
                    className="text-muted hover:text-danger p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
