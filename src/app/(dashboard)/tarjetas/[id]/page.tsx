'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { formatMXN } from '@/lib/utils/currency'
import { getNextPaymentDate, getNextCutOffDate, daysUntil } from '@/lib/utils/dates'
import { format, startOfMonth, endOfMonth, addMonths, isAfter, isBefore } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowLeft, CalendarDays } from 'lucide-react'
import { TransactionList } from '@/components/transactions/transaction-list'
import { InvestmentDetail } from '@/components/cards/investment-detail'
import type { Card, Transaction, FixedExpense } from '@/types/database'

export default function CardDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [card, setCard] = useState<Card | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!isSupabaseConfigured()) { setLoading(false); return }
      const supabase = createClient()
      const [cardRes, txRes, feRes] = await Promise.all([
        supabase.from('cards').select('*').eq('id', id).single(),
        supabase.from('transactions').select('*, card:cards!transactions_card_id_fkey(*)').eq('card_id', id).order('date', { ascending: false }).limit(50),
        supabase.from('fixed_expenses').select('*').eq('card_id', id).eq('status', 'active'),
      ])
      setCard(cardRes.data)
      setTransactions(txRes.data ?? [])
      setFixedExpenses(feRes.data ?? [])
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!card) {
    return <p className="text-center text-muted py-16">Tarjeta no encontrada</p>
  }

  const isCredit = card.card_type === 'credit'
  const nextPayment = card.payment_day != null ? getNextPaymentDate(card.payment_day) : null
  const nextCutOff = card.cut_off_day != null ? getNextCutOffDate(card.cut_off_day) : null

  const monthExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const monthIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const now = new Date()
  const currentMonthStart = startOfMonth(now)
  const currentMonthEnd = endOfMonth(now)

  const activeFixedExpenses = fixedExpenses.filter(fe => {
    const feStart = startOfMonth(new Date(fe.start_date + 'T12:00:00'))
    if (isAfter(feStart, currentMonthEnd)) return false
    if (fe.is_msi && fe.total_months > 1) {
      const feExpiry = endOfMonth(addMonths(feStart, fe.total_months - 1))
      if (isBefore(feExpiry, currentMonthStart)) return false
    }
    if (!fe.is_msi && fe.end_date) {
      const feEnd = new Date(fe.end_date + 'T12:00:00')
      if (isBefore(feEnd, currentMonthStart)) return false
    }
    return true
  })

  const fixedMonthly = activeFixedExpenses.reduce((sum, fe) => sum + Number(fe.monthly_amount), 0)

  const expectedPayment = isCredit ? (card.used_credit ?? 0) : 0

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-muted hover:text-foreground transition">
        <ArrowLeft size={16} /> Volver
      </button>

      <div className="rounded-xl p-5 text-white" style={{ background: `linear-gradient(135deg, ${card.color}, ${card.color}dd)` }}>
        <p className="text-sm opacity-70">{card.bank_name}</p>
        <p className="text-xl font-bold">{card.alias}</p>
        {card.last_four_digits && <p className="text-sm font-mono mt-1 opacity-60">**** {card.last_four_digits}</p>}
      </div>

      {card.card_type === 'investment' && <InvestmentDetail card={card} />}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {card.balance != null && (
          <div className="bg-white rounded-xl border border-border p-4">
            <p className="text-xs text-muted mb-1">Saldo</p>
            <p className="text-lg font-bold">{formatMXN(card.balance)}</p>
          </div>
        )}
        {isCredit && card.credit_limit != null && (
          <div className="bg-white rounded-xl border border-border p-4">
            <p className="text-xs text-muted mb-1">Disponible</p>
            <p className="text-lg font-bold text-success">{formatMXN(card.credit_limit - (card.used_credit ?? 0))}</p>
          </div>
        )}
        {isCredit && (
          <div className="bg-white rounded-xl border border-border p-4">
            <p className="text-xs text-muted mb-1">Por pagar</p>
            <p className="text-lg font-bold text-danger">{formatMXN(expectedPayment)}</p>
          </div>
        )}
        <div className="bg-white rounded-xl border border-border p-4">
          <p className="text-xs text-muted mb-1">Gastos del mes</p>
          <p className="text-lg font-bold text-danger">{formatMXN(monthExpenses)}</p>
        </div>
      </div>

      {(nextPayment || nextCutOff) && (
        <div className="grid grid-cols-2 gap-3">
          {nextCutOff && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <CalendarDays size={16} className="text-yellow-600" />
                <p className="text-xs text-yellow-700">Próximo corte</p>
              </div>
              <p className="font-semibold text-yellow-800">
                {format(nextCutOff, "d 'de' MMMM", { locale: es })}
              </p>
              <p className="text-xs text-yellow-600 mt-0.5">En {daysUntil(nextCutOff)} días</p>
            </div>
          )}
          {nextPayment && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <CalendarDays size={16} className="text-red-600" />
                <p className="text-xs text-red-700">Próximo pago</p>
              </div>
              <p className="font-semibold text-red-800">
                {format(nextPayment, "d 'de' MMMM", { locale: es })}
              </p>
              <p className="text-xs text-red-600 mt-0.5">En {daysUntil(nextPayment)} días</p>
            </div>
          )}
        </div>
      )}

      {activeFixedExpenses.length > 0 && (
        <div className="bg-white rounded-xl border border-border p-4">
          <h3 className="font-semibold text-sm mb-3">Gastos fijos asociados</h3>
          <div className="space-y-2">
            {activeFixedExpenses.map(fe => (
              <div key={fe.id} className="flex justify-between text-sm">
                <span>{fe.description}</span>
                <span className="font-medium text-danger">{formatMXN(fe.monthly_amount)}/mes</span>
              </div>
            ))}
            <div className="border-t border-border pt-2 flex justify-between text-sm font-semibold">
              <span>Total mensual fijo</span>
              <span className="text-danger">{formatMXN(fixedMonthly)}</span>
            </div>
          </div>
        </div>
      )}

      {monthIncome > 0 && (
        <div className="bg-white rounded-xl border border-border p-4">
          <h3 className="font-semibold text-sm mb-1">Ingresos recibidos</h3>
          <p className="text-lg font-bold text-success">{formatMXN(monthIncome)}</p>
        </div>
      )}

      <div>
        <h3 className="font-semibold text-sm mb-3">Movimientos recientes</h3>
        <TransactionList transactions={transactions} />
      </div>
    </div>
  )
}
