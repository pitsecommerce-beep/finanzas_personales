'use client'

import { formatMXN } from '@/lib/utils/currency'
import { ArrowDownCircle, ArrowUpCircle, Wallet } from 'lucide-react'

interface SummaryCardsProps {
  income: number
  expenses: number
}

export function SummaryCards({ income, expenses }: SummaryCardsProps) {
  const balance = income - expenses

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-white rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-2">
          <ArrowUpCircle size={16} className="text-success" />
          <span className="text-xs text-muted">Ingresos</span>
        </div>
        <p className="text-lg font-bold text-success">{formatMXN(income)}</p>
      </div>

      <div className="bg-white rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-2">
          <ArrowDownCircle size={16} className="text-danger" />
          <span className="text-xs text-muted">Gastos</span>
        </div>
        <p className="text-lg font-bold text-danger">{formatMXN(expenses)}</p>
      </div>

      <div className="bg-white rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-2">
          <Wallet size={16} className={balance >= 0 ? 'text-accent' : 'text-danger'} />
          <span className="text-xs text-muted">Balance</span>
        </div>
        <p className={`text-lg font-bold ${balance >= 0 ? 'text-accent' : 'text-danger'}`}>
          {formatMXN(balance)}
        </p>
      </div>
    </div>
  )
}
