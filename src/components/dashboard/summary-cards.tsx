'use client'

import { formatMXN } from '@/lib/utils/currency'
import { ArrowDownCircle, ArrowUpCircle, Wallet, Landmark } from 'lucide-react'
import type { Card } from '@/types/database'

interface SummaryCardsProps {
  income: number
  expenses: number
  cards?: Card[]
}

export function SummaryCards({ income, expenses, cards = [] }: SummaryCardsProps) {
  const balance = income - expenses

  const liquidity = cards
    .filter((c) => c.card_type === 'debit' || c.card_type === 'cash' || c.card_type === 'savings' || c.card_type === 'voucher')
    .reduce((sum, c) => sum + (c.balance ?? 0), 0)

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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

      <div className="bg-white rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-2">
          <Landmark size={16} className="text-blue-500" />
          <span className="text-xs text-muted">Liquidez</span>
        </div>
        <p className="text-lg font-bold text-blue-500">{formatMXN(liquidity)}</p>
      </div>
    </div>
  )
}
