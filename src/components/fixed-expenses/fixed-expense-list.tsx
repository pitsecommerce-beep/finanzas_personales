'use client'

import type { FixedExpense } from '@/types/database'
import { getCategoryEmoji } from '@/lib/constants/categories'
import { formatMXN } from '@/lib/utils/currency'
import { getRemainingMonths } from '@/lib/utils/dates'
import { Trash2 } from 'lucide-react'

interface FixedExpenseListProps {
  expenses: FixedExpense[]
  onDelete?: (id: string) => void
}

export function FixedExpenseList({ expenses, onDelete }: FixedExpenseListProps) {
  if (expenses.length === 0) {
    return (
      <div className="text-center py-12 text-muted">
        <p className="text-4xl mb-2">📌</p>
        <p className="text-sm">No hay gastos fijos registrados</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {expenses.map((exp) => {
        const remaining = getRemainingMonths(exp.start_date, exp.total_months)
        const paid = exp.total_months - remaining
        const progress = (paid / exp.total_months) * 100

        return (
          <div key={exp.id} className="bg-white rounded-xl border border-border p-4">
            <div className="flex items-start gap-3">
              <span className="text-xl">{getCategoryEmoji(exp.category)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm truncate">{exp.description}</p>
                  {onDelete && (
                    <button
                      onClick={() => onDelete(exp.id)}
                      className="text-muted hover:text-danger p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-muted">
                  <span>Mensualidad: {formatMXN(exp.monthly_amount)}</span>
                  <span>Total: {formatMXN(exp.total_amount)}</span>
                </div>
                {exp.card && (
                  <p className="text-xs text-muted mt-0.5">{exp.card.alias}</p>
                )}

                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted">{paid} de {exp.total_months} meses</span>
                    <span className={remaining === 0 ? 'text-success font-medium' : 'text-accent font-medium'}>
                      {remaining === 0 ? 'Liquidado' : `${remaining} restantes`}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all bg-accent"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
