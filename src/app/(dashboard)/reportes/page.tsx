'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SpendingChart } from '@/components/dashboard/spending-chart'
import { SummaryCards } from '@/components/dashboard/summary-cards'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { formatMXN } from '@/lib/utils/currency'
import { format, subMonths, startOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Transaction } from '@/types/database'

export default function ReportesPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([])
  const [period, setPeriod] = useState('month')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const now = new Date()
      let startDate: string

      if (period === 'month') {
        startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
      } else if (period === '3months') {
        const d = subMonths(now, 3)
        startDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
      } else {
        startDate = `${now.getFullYear()}-01-01`
      }

      const [filtered, all] = await Promise.all([
        supabase
          .from('transactions')
          .select('*, card:cards(*)')
          .gte('date', startDate)
          .order('date', { ascending: false }),
        supabase
          .from('transactions')
          .select('*')
          .gte('date', format(subMonths(now, 5), 'yyyy-MM-01'))
          .order('date', { ascending: true }),
      ])

      setTransactions(filtered.data ?? [])
      setAllTransactions(all.data ?? [])
      setLoading(false)
    }
    load()
  }, [period])

  const income = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const expenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const monthlyData = (() => {
    const months: Record<string, { month: string; ingresos: number; gastos: number }> = {}
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i)
      const key = format(d, 'yyyy-MM')
      months[key] = {
        month: format(d, 'MMM', { locale: es }),
        ingresos: 0,
        gastos: 0,
      }
    }
    allTransactions.forEach((t) => {
      const key = t.date.slice(0, 7)
      if (months[key]) {
        if (t.type === 'income') months[key].ingresos += Number(t.amount)
        else months[key].gastos += Number(t.amount)
      }
    })
    return Object.values(months)
  })()

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
        <h1 className="text-2xl font-bold">Reportes</h1>
        <div className="flex gap-1 bg-white rounded-lg border border-border p-1">
          {[
            { value: 'month', label: 'Mes' },
            { value: '3months', label: '3 meses' },
            { value: 'year', label: 'Año' },
          ].map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1 rounded text-xs font-medium transition ${
                period === p.value ? 'bg-accent text-white' : 'text-muted hover:text-foreground'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <SummaryCards income={income} expenses={expenses} />

      <SpendingChart transactions={transactions} />

      <div className="bg-white rounded-xl border border-border p-4">
        <h3 className="font-semibold text-sm mb-4">Ingresos vs Gastos (6 meses)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value) => formatMXN(Number(value))}
                contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px' }}
              />
              <Bar dataKey="ingresos" fill="#10B981" radius={[4, 4, 0, 0]} name="Ingresos" />
              <Bar dataKey="gastos" fill="#EF4444" radius={[4, 4, 0, 0]} name="Gastos" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {income > 0 && (
        <div className="bg-white rounded-xl border border-border p-4">
          <h3 className="font-semibold text-sm mb-2">Tasa de ahorro</h3>
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#E2E8F0"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke={income - expenses >= 0 ? '#14B8A6' : '#EF4444'}
                  strokeWidth="3"
                  strokeDasharray={`${Math.max(0, Math.min(100, ((income - expenses) / income) * 100))}, 100`}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                {Math.round(((income - expenses) / income) * 100)}%
              </span>
            </div>
            <div>
              <p className="text-sm text-muted">
                Estás ahorrando {formatMXN(Math.max(0, income - expenses))} este periodo
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
