'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { formatMXN } from '@/lib/utils/currency'
import { getNextPaymentDate, getNextCutOffDate, daysUntil } from '@/lib/utils/dates'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowLeft, CalendarDays } from 'lucide-react'
import { TransactionList } from '@/components/transactions/transaction-list'
import { InvestmentDetail } from '@/components/cards/investment-detail'
import type { Account, AccountBalance, LedgerEntry, InstallmentPlan } from '@/types/database'

export default function CardDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [account, setAccount] = useState<Account | null>(null)
  const [balance, setBalance] = useState<AccountBalance | null>(null)
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [installments, setInstallments] = useState<InstallmentPlan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!isSupabaseConfigured()) { setLoading(false); return }
      const supabase = createClient()
      const [accountRes, balanceRes, entriesRes, installRes] = await Promise.all([
        supabase.from('accounts').select('*').eq('id', id).single(),
        supabase.from('v_account_balances').select('*').eq('account_id', id).single(),
        supabase.from('ledger_entries').select('*, account:accounts(*), category:categories(*)').eq('account_id', id).is('deleted_at', null).order('occurred_on', { ascending: false }).limit(50),
        supabase.from('installment_plans').select('*').eq('account_id', id).eq('is_active', true),
      ])
      setAccount(accountRes.data)
      setBalance(balanceRes.data)
      setEntries(entriesRes.data ?? [])
      setInstallments(installRes.data ?? [])
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

  if (!account) {
    return <p className="text-center text-muted py-16">Cuenta no encontrada</p>
  }

  const isCredit = account.account_type === 'credit_card'
  const nextPayment = account.payment_day != null ? getNextPaymentDate(account.payment_day) : null
  const nextCutOff = account.cut_off_day != null ? getNextCutOffDate(account.cut_off_day) : null
  const currentBalance = balance?.current_balance ?? account.opening_balance

  const monthExpenses = entries
    .filter(e => e.entry_type === 'expense')
    .reduce((sum, e) => sum + Math.abs(Number(e.amount)), 0)

  const monthIncome = entries
    .filter(e => e.entry_type === 'income')
    .reduce((sum, e) => sum + Number(e.amount), 0)

  const fixedMonthly = installments.reduce((sum, ip) => sum + Number(ip.monthly_amount), 0)

  const isLight = account.color === '#F5F0E8'

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-muted hover:text-foreground transition">
        <ArrowLeft size={16} /> Volver
      </button>

      <div className={`rounded-xl p-5 ${isLight ? 'text-gray-800' : 'text-white'}`} style={{ background: `linear-gradient(135deg, ${account.color}, ${account.color}dd)` }}>
        <p className={`text-sm ${isLight ? 'text-gray-500' : 'opacity-70'}`}>{account.institution}</p>
        <p className="text-xl font-bold">{account.alias}</p>
        {account.last_four && <p className={`text-sm font-mono mt-1 ${isLight ? 'text-gray-400' : 'opacity-60'}`}>**** {account.last_four}</p>}
      </div>

      {account.account_type === 'investment' && <InvestmentDetail account={account} balance={balance ?? undefined} />}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-border p-4">
          <p className="text-xs text-muted mb-1">Saldo</p>
          <p className="text-lg font-bold">{formatMXN(currentBalance)}</p>
        </div>
        {isCredit && account.credit_limit != null && (
          <div className="bg-white rounded-xl border border-border p-4">
            <p className="text-xs text-muted mb-1">Disponible</p>
            <p className="text-lg font-bold text-success">{formatMXN(account.credit_limit + currentBalance)}</p>
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
                <p className="text-xs text-yellow-700">Proximo corte</p>
              </div>
              <p className="font-semibold text-yellow-800">
                {format(nextCutOff, "d 'de' MMMM", { locale: es })}
              </p>
              <p className="text-xs text-yellow-600 mt-0.5">En {daysUntil(nextCutOff)} dias</p>
            </div>
          )}
          {nextPayment && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <CalendarDays size={16} className="text-red-600" />
                <p className="text-xs text-red-700">Proximo pago</p>
              </div>
              <p className="font-semibold text-red-800">
                {format(nextPayment, "d 'de' MMMM", { locale: es })}
              </p>
              <p className="text-xs text-red-600 mt-0.5">En {daysUntil(nextPayment)} dias</p>
            </div>
          )}
        </div>
      )}

      {installments.length > 0 && (
        <div className="bg-white rounded-xl border border-border p-4">
          <h3 className="font-semibold text-sm mb-3">Gastos fijos asociados</h3>
          <div className="space-y-2">
            {installments.map(ip => (
              <div key={ip.id} className="flex justify-between text-sm">
                <span>{ip.description}</span>
                <span className="font-medium text-danger">{formatMXN(ip.monthly_amount)}/mes</span>
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
        <TransactionList entries={entries} />
      </div>
    </div>
  )
}
