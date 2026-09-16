'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { formatMXN } from '@/lib/utils/currency'
import { format, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'
import { es } from 'date-fns/locale'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Transaction } from '@/types/database'

type Period = 'month' | 'semester' | 'year'

interface PylRow {
  category: string
  income: number
  expense: number
}

const CATEGORY_LABELS: Record<string, string> = {
  nomina: 'Nomina',
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
  educacion: 'Educacion',
  ropa: 'Ropa',
  servicios: 'Servicios',
  hogar: 'Hogar',
  mascotas: 'Mascotas',
  viajes: 'Viajes',
  suscripciones: 'Suscripciones',
  otros: 'Otros',
}

export default function PylPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
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
        const { data } = await supabase
          .from('transactions')
          .select('*')
          .gte('date', format(start, 'yyyy-MM-dd'))
          .lte('date', format(end, 'yyyy-MM-dd'))
          .eq('is_transfer', false)
          .order('date', { ascending: false })
        setTransactions(data ?? [])
      } catch (err) {
        console.warn('[Nummo] Error al cargar P&L:', err)
      }
      setLoading(false)
    }
    load()
  }, [period, getDateRange])

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

  async function downloadExcel() {
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()

    const { start, end } = getDateRange()
    const periodLabel = period === 'month'
      ? format(start, 'MMMM yyyy', { locale: es })
      : period === 'semester'
        ? `${format(start, 'MMM yyyy', { locale: es })} - ${format(end, 'MMM yyyy', { locale: es })}`
        : format(start, 'yyyy')

    const rows: (string | number)[][] = [
      ['Estado de Resultados', '', ''],
      ['Periodo:', periodLabel, ''],
      ['', '', ''],
      ['INGRESOS', '', ''],
      ['Categoria', 'Monto', ''],
    ]

    incomeRows.forEach((r) => rows.push([r.category, r.income, '']))
    rows.push(['Total Ingresos', totalIncome, ''])
    rows.push(['', '', ''])
    rows.push(['GASTOS', '', ''])
    rows.push(['Categoria', 'Monto', ''])
    expenseRows.forEach((r) => rows.push([r.category, r.expense, '']))
    rows.push(['Total Gastos', totalExpense, ''])
    rows.push(['', '', ''])
    rows.push(['RESULTADO NETO', netResult, ''])

    const ws = XLSX.utils.aoa_to_sheet(rows)

    ws['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 5 }]

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
              { value: 'year' as Period, label: 'Ano' },
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

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="bg-success/5 px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-sm text-success">Ingresos</h3>
        </div>
        {incomeRows.length === 0 ? (
          <p className="text-sm text-muted p-4">Sin ingresos en este periodo</p>
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
          <h3 className="font-semibold text-sm text-danger">Gastos</h3>
        </div>
        {expenseRows.length === 0 ? (
          <p className="text-sm text-muted p-4">Sin gastos en este periodo</p>
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
            ? `Estas generando un superavit de ${formatMXN(netResult)} en este periodo`
            : `Tu gasto supera tus ingresos por ${formatMXN(Math.abs(netResult))}`
          }
        </p>
      </div>
    </div>
  )
}
