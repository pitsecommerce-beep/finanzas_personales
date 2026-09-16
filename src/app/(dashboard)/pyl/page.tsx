'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { formatMXN } from '@/lib/utils/currency'
import { format, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear, getDaysInMonth, differenceInDays, addDays, addMonths, isBefore, isAfter } from 'date-fns'
import { es } from 'date-fns/locale'
import { Download, TrendingUp, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Transaction, FixedExpense, IncomeSource } from '@/types/database'

type Period = 'month' | 'semester' | 'year'

interface PylRow {
  category: string
  income: number
  expense: number
}

const CATEGORY_LABELS: Record<string, string> = {
  nomina: 'Nómina',
  freelance: 'Freelance',
  rendimientos: 'Rendimientos',
  renta: 'Renta',
  venta: 'Venta',
  regalo: 'Regalo',
  otros_ingresos: 'Otros ingresos',
  comida: 'Comida',
  transporte: 'Transporte',
  entretenimiento: 'Entretenimiento',
  salud: 'Salud',
  educacion: 'Educación',
  ropa: 'Ropa',
  servicios: 'Servicios',
  hogar: 'Hogar',
  mascotas: 'Mascotas',
  viajes: 'Viajes',
  suscripciones: 'Suscripciones',
  otros: 'Otros',
}

function getMonthlyIncomeAmount(src: IncomeSource): number {
  if (src.frequency === 'weekly') return src.amount * 4
  if (src.frequency === 'biweekly') return src.amount * 2
  return src.amount
}

function countOccurrencesInRange(src: IncomeSource, start: Date, end: Date): number {
  if (!src.next_payment_date) return 0
  const baseDate = new Date(src.next_payment_date + 'T12:00:00')
  const stepDays = src.frequency === 'weekly' ? 7 : src.frequency === 'biweekly' ? 15 : 0
  const advance = stepDays > 0
    ? (d: Date, dir: number) => addDays(d, stepDays * dir)
    : (d: Date, dir: number) => addMonths(d, dir)

  let d = baseDate
  while (isAfter(d, start)) d = advance(d, -1)

  let count = 0
  while (!isAfter(d, end)) {
    if (!isBefore(d, start)) count++
    d = advance(d, 1)
  }
  return count
}

export default function PylPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([])
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([])
  const [period, setPeriod] = useState<Period>('month')
  const [loading, setLoading] = useState(true)

  const getDateRange = useCallback(() => {
    const now = new Date()
    if (period === 'month') {
      return { start: startOfMonth(now), end: endOfMonth(now) }
    } else if (period === 'semester') {
      return { start: startOfMonth(subMonths(now, 5)), end: endOfMonth(now) }
    }
    return { start: startOfYear(now), end: endOfYear(now) }
  }, [period])

  useEffect(() => {
    async function load() {
      if (!isSupabaseConfigured()) { setLoading(false); return }
      try {
        const supabase = createClient()
        const { start, end } = getDateRange()
        const [txRes, feRes, isRes] = await Promise.all([
          supabase
            .from('transactions')
            .select('*')
            .gte('date', format(start, 'yyyy-MM-dd'))
            .lte('date', format(end, 'yyyy-MM-dd'))
            .eq('is_transfer', false)
            .order('date', { ascending: false }),
          supabase
            .from('fixed_expenses')
            .select('*')
            .eq('status', 'active'),
          supabase
            .from('income_sources')
            .select('*'),
        ])
        setTransactions(txRes.data ?? [])
        setFixedExpenses(feRes.data ?? [])
        setIncomeSources(isRes.data ?? [])
      } catch (err) {
        console.warn('[Nummo] Error al cargar P&L:', err)
      }
      setLoading(false)
    }
    load()
  }, [period, getDateRange])

  const { start: rangeStart, end: rangeEnd } = getDateRange()

  const incomeRows: PylRow[] = []
  const expenseRows: PylRow[] = []

  const grouped: Record<string, { income: number; expense: number }> = {}
  transactions.forEach((t) => {
    const cat = t.category || 'otros'
    if (!grouped[cat]) grouped[cat] = { income: 0, expense: 0 }
    if (t.type === 'income') grouped[cat].income += Number(t.amount)
    else grouped[cat].expense += Number(t.amount)
  })

  Object.entries(grouped).forEach(([cat, vals]) => {
    const label = CATEGORY_LABELS[cat] || cat
    if (vals.income > 0) incomeRows.push({ category: label, income: vals.income, expense: 0 })
    if (vals.expense > 0) expenseRows.push({ category: label, income: 0, expense: vals.expense })
  })

  incomeRows.sort((a, b) => b.income - a.income)
  expenseRows.sort((a, b) => b.expense - a.expense)

  const totalIncome = incomeRows.reduce((s, r) => s + r.income, 0)
  const totalExpense = expenseRows.reduce((s, r) => s + r.expense, 0)
  const netResult = totalIncome - totalExpense

  const now = new Date()
  const isCurrentMonth = period === 'month'
  const monthEnd = endOfMonth(now)
  const daysLeft = differenceInDays(monthEnd, now)
  const totalDaysInMonth = getDaysInMonth(now)

  const projectedFixedExpenses = fixedExpenses.reduce((sum, fe) => sum + Number(fe.monthly_amount), 0)

  const projectedIncome = incomeSources.reduce((sum, src) => {
    if (isCurrentMonth) {
      const occurrences = countOccurrencesInRange(src, startOfMonth(now), monthEnd)
      return sum + (src.amount * occurrences)
    }
    const months = period === 'semester' ? 6 : 12
    return sum + (getMonthlyIncomeAmount(src) * months)
  }, 0)

  const projectedEndOfMonth = isCurrentMonth
    ? (projectedIncome - projectedFixedExpenses) + netResult - totalIncome + totalExpense - totalExpense
    : 0

  const remainingFixedNotPaid = projectedFixedExpenses
  const remainingIncome = projectedIncome - totalIncome
  const projectedNet = netResult + remainingIncome - remainingFixedNotPaid

  async function downloadExcel() {
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()

    const periodLabel = period === 'month'
      ? format(rangeStart, 'MMMM yyyy', { locale: es })
      : period === 'semester'
        ? `${format(rangeStart, 'MMM yyyy', { locale: es })} - ${format(rangeEnd, 'MMM yyyy', { locale: es })}`
        : format(rangeStart, 'yyyy')

    const rows: (string | number)[][] = [
      ['Estado de Resultados', '', ''],
      ['Periodo:', periodLabel, ''],
      ['', '', ''],
      ['INGRESOS', '', ''],
      ['Categoría', 'Monto', ''],
    ]

    incomeRows.forEach((r) => rows.push([r.category, r.income, '']))
    rows.push(['Total Ingresos', totalIncome, ''])
    rows.push(['', '', ''])
    rows.push(['GASTOS', '', ''])
    rows.push(['Categoría', 'Monto', ''])
    expenseRows.forEach((r) => rows.push([r.category, r.expense, '']))
    rows.push(['Total Gastos', totalExpense, ''])
    rows.push(['', '', ''])
    rows.push(['RESULTADO NETO', netResult, ''])

    if (isCurrentMonth) {
      rows.push(['', '', ''])
      rows.push(['PROYECCIÓN FIN DE MES', '', ''])
      rows.push(['Ingreso proyectado restante', remainingIncome, ''])
      rows.push(['Gastos fijos pendientes', remainingFixedNotPaid, ''])
      rows.push(['Resultado proyectado', projectedNet, ''])
    }

    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 5 }]

    XLSX.utils.book_append_sheet(wb, ws, 'P&L')
    XLSX.writeFile(wb, `nummo_pyl_${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
  }

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
        <div>
          <h1 className="text-2xl font-bold">Estado de resultados</h1>
          <p className="text-sm text-muted">Ingresos vs Gastos por periodo</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-white rounded-lg border border-border p-1">
            {([
              { value: 'month' as Period, label: 'Mes' },
              { value: 'semester' as Period, label: 'Semestre' },
              { value: 'year' as Period, label: 'Año' },
            ]).map((p) => (
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
          <Button onClick={downloadExcel} size="sm" variant="outline">
            <Download size={14} /> Excel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-border p-4 text-center">
          <p className="text-xs text-muted mb-1">Ingresos</p>
          <p className="text-xl font-bold text-success">{formatMXN(totalIncome)}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4 text-center">
          <p className="text-xs text-muted mb-1">Gastos</p>
          <p className="text-xl font-bold text-danger">{formatMXN(totalExpense)}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4 text-center">
          <p className="text-xs text-muted mb-1">Resultado</p>
          <p className={`text-xl font-bold ${netResult >= 0 ? 'text-success' : 'text-danger'}`}>
            {formatMXN(netResult)}
          </p>
        </div>
      </div>

      {isCurrentMonth && (
        <div className="bg-accent/5 border border-accent/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            {projectedNet >= 0 ? <TrendingUp size={18} className="text-success" /> : <TrendingDown size={18} className="text-danger" />}
            <h3 className="font-semibold text-sm">Proyección a fin de mes</h3>
            <span className="text-xs text-muted">({daysLeft} días restantes)</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted mb-1">Ingreso restante esperado</p>
              <p className="text-lg font-bold text-success">{formatMXN(remainingIncome)}</p>
            </div>
            <div>
              <p className="text-xs text-muted mb-1">Gastos fijos pendientes</p>
              <p className="text-lg font-bold text-danger">{formatMXN(remainingFixedNotPaid)}</p>
            </div>
            <div>
              <p className="text-xs text-muted mb-1">Resultado proyectado</p>
              <p className={`text-lg font-bold ${projectedNet >= 0 ? 'text-success' : 'text-danger'}`}>
                {formatMXN(projectedNet)}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted mt-3">
            Basado en tus ingresos configurados y gastos fijos activos. Las transacciones ya registradas se incluyen en el resultado actual.
          </p>
        </div>
      )}

      {fixedExpenses.length > 0 && (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="bg-yellow-50 px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-sm text-yellow-700">Gastos fijos mensuales</h3>
          </div>
          <div className="divide-y divide-border">
            {fixedExpenses.map((fe) => (
              <div key={fe.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <span className="text-sm">{fe.description}</span>
                  <span className="text-xs text-muted ml-2">{fe.category}</span>
                </div>
                <span className="text-sm font-medium text-danger">{formatMXN(fe.monthly_amount)}/mes</span>
              </div>
            ))}
            <div className="flex items-center justify-between px-4 py-3 bg-yellow-50">
              <span className="text-sm font-semibold">Total mensual fijo</span>
              <span className="text-sm font-bold text-danger">{formatMXN(projectedFixedExpenses)}</span>
            </div>
          </div>
        </div>
      )}

      {incomeSources.length > 0 && (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="bg-success/5 px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-sm text-success">Fuentes de ingreso</h3>
          </div>
          <div className="divide-y divide-border">
            {incomeSources.map((src) => (
              <div key={src.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <span className="text-sm">{src.description}</span>
                  <span className="text-xs text-muted ml-2 capitalize">{src.frequency === 'monthly' ? 'Mensual' : src.frequency === 'biweekly' ? 'Quincenal' : 'Semanal'}</span>
                </div>
                <span className="text-sm font-medium text-success">{formatMXN(src.amount)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between px-4 py-3 bg-success/5">
              <span className="text-sm font-semibold">Ingreso mensual estimado</span>
              <span className="text-sm font-bold text-success">{formatMXN(incomeSources.reduce((s, src) => s + getMonthlyIncomeAmount(src), 0))}</span>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="bg-success/5 px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-sm text-success">Ingresos registrados</h3>
        </div>
        {incomeRows.length === 0 ? (
          <p className="text-sm text-muted p-4">Sin ingresos registrados en este periodo</p>
        ) : (
          <div className="divide-y divide-border">
            {incomeRows.map((r) => (
              <div key={r.category} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm">{r.category}</span>
                <span className="text-sm font-medium text-success">{formatMXN(r.income)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between px-4 py-3 bg-success/5">
              <span className="text-sm font-semibold">Total</span>
              <span className="text-sm font-bold text-success">{formatMXN(totalIncome)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="bg-danger/5 px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-sm text-danger">Gastos registrados</h3>
        </div>
        {expenseRows.length === 0 ? (
          <p className="text-sm text-muted p-4">Sin gastos registrados en este periodo</p>
        ) : (
          <div className="divide-y divide-border">
            {expenseRows.map((r) => (
              <div key={r.category} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm">{r.category}</span>
                <span className="text-sm font-medium text-danger">{formatMXN(r.expense)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between px-4 py-3 bg-danger/5">
              <span className="text-sm font-semibold">Total</span>
              <span className="text-sm font-bold text-danger">{formatMXN(totalExpense)}</span>
            </div>
          </div>
        )}
      </div>

      <div className={`rounded-xl border p-4 ${netResult >= 0 ? 'bg-success/5 border-success/20' : 'bg-danger/5 border-danger/20'}`}>
        <div className="flex items-center justify-between">
          <span className="font-semibold">Resultado neto</span>
          <span className={`text-2xl font-bold ${netResult >= 0 ? 'text-success' : 'text-danger'}`}>
            {formatMXN(netResult)}
          </span>
        </div>
        <p className="text-xs text-muted mt-1">
          {netResult >= 0
            ? `Estás generando un superávit de ${formatMXN(netResult)} en este periodo`
            : `Tu gasto supera tus ingresos por ${formatMXN(Math.abs(netResult))}`
          }
        </p>
      </div>
    </div>
  )
}
