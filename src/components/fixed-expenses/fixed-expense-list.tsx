'use client'

import type { FixedExpense } from '@/types/database'
import { getCategoryEmoji } from '@/lib/constants/categories'
import { formatMXN } from '@/lib/utils/currency'
import { getRemainingMonths } from '@/lib/utils/dates'
import { Trash2, Pencil } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface FixedExpenseListProps {
  expenses: FixedExpense[]
  onEdit?: (expense: FixedExpense) => void
  onDelete?: (id: string) => void
}

export function FixedExpenseList({ expenses, onEdit, onDelete }: FixedExpenseListProps) {
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
        const isMsi = exp.is_msi !== false && exp.total_months > 1
        const remaining = isMsi ? getRemainingMonths(exp.start_date, exp.total_months) : 0
        const paid = isMsi ? exp.total_months - remaining : 0
        const progress = isMsi ? (paid / exp.total_months) * 100 : 0

        return (
          <div key={exp.id} className="bg-white rounded-xl border border-border p-4">
            <div className="flex items-start gap-3">
              <span className="text-xl">{getCategoryEmoji(exp.category)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{exp.description}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      isMsi ? 'bg-accent/10 text-accent' : 'bg-gray-100 text-muted'
                    }`}>
                      {isMsi ? 'MSI' : 'Mensual'}
                    </span>
                    {exp.currency === 'USD' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">
                        USD · TC ${exp.exchange_rate?.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(exp)}
                        className="text-muted hover:text-accent p-1"
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(exp.id)}
                        className="text-muted hover:text-danger p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-muted">
                  <span>Mensualidad: {formatMXN(exp.monthly_amount)}</span>
                  {isMsi && <span>Total: {formatMXN(exp.total_amount)}</span>}
                </div>
                {exp.card && (
                  <p className="text-xs text-muted mt-0.5">{exp.card.alias}</p>
                )}

                {!isMsi && (
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted">
                    <span>Desde: {format(new Date(exp.start_date + 'T12:00:00'), "d MMM yyyy", { locale: es })}</span>
                    {exp.end_date && (
                      <span>Hasta: {format(new Date(exp.end_date + 'T12:00:00'), "d MMM yyyy", { locale: es })}</span>
                    )}
                    {!exp.end_date && <span>Sin fecha de fin</span>}
                  </div>
                )}

                {isMsi && (
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
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
