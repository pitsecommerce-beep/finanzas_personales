'use client'

import { useEffect, useState } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { formatMXN } from '@/lib/utils/currency'
import { format, startOfMonth, endOfMonth, addMonths, addDays, isBefore, isAfter, isSameMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { LedgerEntry, InstallmentPlan, RecurringRule, Account, AccountBalance, Debt } from '@/types/database'

type Period = 'month' | 'semester' | 'year'

function countOccurrencesInMonth(rule: RecurringRule, monthDate: Date): number {
  if (!rule.next_occurrence) return 0
  const mStart = startOfMonth(monthDate)
  const mEnd = endOfMonth(monthDate)
  const baseDate = new Date(rule.next_occurrence + 'T12:00:00')
  const stepDays = rule.frequency === 'weekly' ? 7 : rule.frequency === 'biweekly' ? 15 : 0
  const advance = stepDays > 0
    ? (d: Date, dir: number) => addDays(d, stepDays * dir)
    : (d: Date, dir: number) => addMonths(d, dir)

  let d = baseDate
  while (isAfter(d, mStart)) d = advance(d, -1)
  let count = 0
  while (!isAfter(d, mEnd)) {
    if (!isBefore(d, mStart)) count++
    d = advance(d, 1)
  }
  return count
}

function getMonthColumns(period: Period): Date[] {
  const now = new Date()
  if (period === 'month') return [startOfMonth(now)]
  const count = period === 'semester' ? 6 : 12
  const months: Date[] = []
  for (let i = 0; i < count; i++) {
    months.push(startOfMonth(addMonths(now, i)))
  }
  return months
}

interface MonthData {
  fixedIncome: { description: string; amount: number }[]
  sporadicIncome: { category: string; amount: number }[]
  receivables: { person: string; amount: number }[]
  fixedExpenses: { id: string; description: string; amount: number }[]
  sporadicExpenses: { description: string; category: string; amount: number }[]
  payables: { person: string; amount: number }[]
  totalIncome: number
  totalExpense: number
  net: number
  accountProjections: { account: Account; balance: number; projected: number }[]
}

const CATEGORY_LABELS: Record<string, string> = {
  nomina: 'Nómina', freelance: 'Freelance', rendimientos: 'Rendimientos',
  renta: 'Renta', venta: 'Venta', regalo: 'Regalo', otros_ingresos: 'Otros ingresos',
  comida: 'Comida', transporte: 'Transporte', entretenimiento: 'Entretenimiento',
  salud: 'Salud', educacion: 'Educación', ropa: 'Ropa', servicios: 'Servicios',
  hogar: 'Hogar', mascotas: 'Mascotas', viajes: 'Viajes', suscripciones: 'Suscripciones',
  otros: 'Otros',
}

export default function PylPage() {
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [installments, setInstallments] = useState<InstallmentPlan[]>([])
  const [incomeRules, setIncomeRules] = useState<RecurringRule[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [balances, setBalances] = useState<AccountBalance[]>([])
  const [debts, setDebts] = useState<Debt[]>([])
  const [period, setPeriod] = useState<Period>('month')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!isSupabaseConfigured()) { setLoading(false); return }
      try {
        const supabase = createClient()
        const months = getMonthColumns(period)
        const rangeStart = months[0]
        const rangeEnd = endOfMonth(months[months.length - 1])

        const [leRes, ipRes, rrRes, aRes, bRes, dRes] = await Promise.all([
          supabase.from('ledger_entries').select('*, category:categories(*)')
            .gte('occurred_on', format(rangeStart, 'yyyy-MM-dd'))
            .lte('occurred_on', format(rangeEnd, 'yyyy-MM-dd'))
            .is('deleted_at', null)
            .not('entry_type', 'eq', 'transfer')
            .order('occurred_on', { ascending: false }),
          supabase.from('installment_plans').select('*').eq('is_active', true),
          supabase.from('recurring_rules').select('*').eq('entry_type', 'income').eq('is_active', true),
          supabase.from('accounts').select('*').eq('is_active', true),
          supabase.from('v_account_balances').select('*'),
          supabase.from('debts').select('*').eq('is_paid', false),
        ])
        setEntries(leRes.data ?? [])
        setInstallments(ipRes.data ?? [])
        setIncomeRules(rrRes.data ?? [])
        setAccounts(aRes.data ?? [])
        setBalances(bRes.data ?? [])
        setDebts(dRes.data ?? [])
      } catch (err) {
        console.warn('[Nummo] Error al cargar P&L:', err)
      }
      setLoading(false)
    }
    load()
  }, [period])

  const months = getMonthColumns(period)
  const isMultiMonth = months.length > 1
  const now = new Date()

  const balanceMap = Object.fromEntries(balances.map(b => [b.account_id, b.current_balance]))

  function buildMonthData(monthDate: Date): MonthData {
    const mStart = startOfMonth(monthDate)
    const mEnd = endOfMonth(monthDate)
    const isFuture = isAfter(mStart, now)

    const monthEntries = entries.filter(e => {
      const d = new Date(e.occurred_on + 'T12:00:00')
      return !isBefore(d, mStart) && !isAfter(d, mEnd)
    })

    const fixedIncome = incomeRules.map(rule => {
      const occ = countOccurrencesInMonth(rule, monthDate)
      return { description: rule.description, amount: rule.amount * occ }
    }).filter(r => r.amount > 0)

    const incomeByCategory: Record<string, number> = {}
    monthEntries.filter(e => e.entry_type === 'income').forEach(e => {
      const cat = e.category?.slug || 'otros'
      incomeByCategory[cat] = (incomeByCategory[cat] || 0) + Number(e.amount)
    })
    const sporadicIncome = Object.entries(incomeByCategory).map(([cat, amount]) => ({
      category: CATEGORY_LABELS[cat] || cat, amount,
    })).sort((a, b) => b.amount - a.amount)

    const receivables = debts
      .filter(d => d.type === 'receivable' && d.due_date)
      .filter(d => {
        const dd = new Date(d.due_date! + 'T12:00:00')
        return !isBefore(dd, mStart) && !isAfter(dd, mEnd)
      })
      .map(d => ({ person: d.person_name, amount: Number(d.amount) }))

    const ipList = installments
      .filter(ip => {
        const ipStart = startOfMonth(new Date(ip.start_date + 'T12:00:00'))
        if (isAfter(ipStart, mEnd)) return false
        if (ip.total_months > 1) {
          const ipExpiry = endOfMonth(addMonths(ipStart, ip.total_months - 1))
          if (isBefore(ipExpiry, mStart)) return false
        }
        if (ip.total_months <= 1 && ip.end_date) {
          const ipEnd = new Date(ip.end_date + 'T12:00:00')
          if (isBefore(ipEnd, mStart)) return false
        }
        return true
      })
      .map(ip => ({
        id: ip.id, description: ip.description, amount: Number(ip.monthly_amount),
      }))

    const sporadicExpenses = monthEntries
      .filter(e => e.entry_type === 'expense')
      .map(e => ({
        description: e.description,
        category: CATEGORY_LABELS[e.category?.slug ?? ''] || e.category?.slug || 'Otros',
        amount: Math.abs(Number(e.amount)),
      }))
      .sort((a, b) => b.amount - a.amount)

    const payables = debts
      .filter(d => d.type === 'payable' && d.due_date)
      .filter(d => {
        const dd = new Date(d.due_date! + 'T12:00:00')
        return !isBefore(dd, mStart) && !isAfter(dd, mEnd)
      })
      .map(d => ({ person: d.person_name, amount: Number(d.amount) }))

    const totalFixedIncome = fixedIncome.reduce((s, r) => s + r.amount, 0)
    const totalSporadicIncome = sporadicIncome.reduce((s, r) => s + r.amount, 0)
    const totalReceivables = receivables.reduce((s, r) => s + r.amount, 0)
    const totalIncome = totalFixedIncome + (isFuture ? 0 : totalSporadicIncome) + totalReceivables

    const totalFixed = ipList.reduce((s, r) => s + r.amount, 0)
    const totalSporadicExp = sporadicExpenses.reduce((s, r) => s + r.amount, 0)
    const totalPayables = payables.reduce((s, r) => s + r.amount, 0)
    const totalExpense = totalFixed + (isFuture ? 0 : totalSporadicExp) + totalPayables

    const net = totalIncome - totalExpense

    const accountProjections = accounts
      .filter(a => a.account_type !== 'credit_card')
      .map(account => {
        const currentBalance = balanceMap[account.id] ?? 0

        const acctFixedIncome = incomeRules
          .filter(r => r.account_id === account.id)
          .reduce((s, r) => s + r.amount * countOccurrencesInMonth(r, monthDate), 0)

        const acctFixedExpense = installments
          .filter(ip => ip.account_id === account.id)
          .reduce((s, ip) => s + Number(ip.monthly_amount), 0)

        const acctTxNet = monthEntries
          .filter(e => e.account_id === account.id)
          .reduce((s, e) => s + Number(e.amount), 0)

        const projected = currentBalance + acctFixedIncome - acctFixedExpense + (isFuture ? 0 : acctTxNet)
        return { account, balance: currentBalance, projected }
      })

    return {
      fixedIncome, sporadicIncome, receivables,
      fixedExpenses: ipList, sporadicExpenses, payables,
      totalIncome, totalExpense, net, accountProjections,
    }
  }

  const monthsData = months.map(m => ({ month: m, data: buildMonthData(m) }))

  async function downloadExcel() {
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()
    const rows: (string | number)[][] = [['Estado de Resultados - Nummo']]
    rows.push([])

    if (isMultiMonth) {
      const header = ['Concepto', ...months.map(m => format(m, 'MMM yyyy', { locale: es }))]
      rows.push(header)
      rows.push([])
      rows.push(['INGRESOS FIJOS'])
      const allFixedIncome = new Set<string>()
      monthsData.forEach(md => md.data.fixedIncome.forEach(r => allFixedIncome.add(r.description)))
      allFixedIncome.forEach(desc => {
        rows.push([desc, ...monthsData.map(md => md.data.fixedIncome.find(r => r.description === desc)?.amount ?? 0)])
      })
      rows.push(['Total ingresos fijos', ...monthsData.map(md => md.data.fixedIncome.reduce((s, r) => s + r.amount, 0))])
      rows.push([])
      rows.push(['RESULTADO NETO', ...monthsData.map(md => md.data.net)])
    } else {
      const md = monthsData[0].data
      rows.push(['INGRESOS FIJOS'])
      md.fixedIncome.forEach(r => rows.push([r.description, r.amount]))
      rows.push([])
      rows.push(['GASTOS FIJOS (MSI)'])
      md.fixedExpenses.forEach(r => rows.push([r.description, r.amount]))
      rows.push([])
      rows.push(['RESULTADO NETO', md.net])
    }

    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [{ wch: 30 }, ...months.map(() => ({ wch: 16 }))]
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

  const currentData = monthsData[0].data

  return (
    <div className="space-y-6 max-w-full mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Estado de resultados</h1>
          <p className="text-sm text-muted">
            {isMultiMonth
              ? `${format(months[0], 'MMMM yyyy', { locale: es })} a ${format(months[months.length - 1], 'MMMM yyyy', { locale: es })}`
              : format(months[0], 'MMMM yyyy', { locale: es })
            }
          </p>
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

      {!isMultiMonth ? (
        <SingleMonthView data={currentData} />
      ) : (
        <MultiMonthView monthsData={monthsData} />
      )}
    </div>
  )
}

function SingleMonthView({ data }: { data: MonthData }) {
  const totalIncome = data.fixedIncome.reduce((s, r) => s + r.amount, 0)
    + data.sporadicIncome.reduce((s, r) => s + r.amount, 0)
    + data.receivables.reduce((s, r) => s + r.amount, 0)
  const totalExpense = data.fixedExpenses.reduce((s, r) => s + r.amount, 0)
    + data.sporadicExpenses.reduce((s, r) => s + r.amount, 0)
    + data.payables.reduce((s, r) => s + r.amount, 0)
  const net = totalIncome - totalExpense

  return (
    <div className="space-y-4">
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
          <p className={`text-xl font-bold ${net >= 0 ? 'text-success' : 'text-danger'}`}>{formatMXN(net)}</p>
        </div>
      </div>

      <Section title="Ingresos fijos" color="success" items={data.fixedIncome.map(r => ({ label: r.description, amount: r.amount }))} />
      <Section title="Ingresos esporádicos" color="success" items={data.sporadicIncome.map(r => ({ label: r.category, amount: r.amount }))} emptyText="Sin ingresos esporádicos" />
      <Section title="Cuentas por cobrar" color="success" items={data.receivables.map(r => ({ label: r.person, amount: r.amount }))} emptyText="Sin cuentas por cobrar" />
      <Section title="Gastos fijos" color="danger" items={data.fixedExpenses.map(r => ({ label: r.description, amount: r.amount }))} />
      <Section title="Gastos esporádicos" color="danger" items={data.sporadicExpenses.map(r => ({ label: r.description, amount: r.amount }))} emptyText="Sin gastos esporádicos" />
      <Section title="Cuentas por pagar" color="danger" items={data.payables.map(r => ({ label: r.person, amount: r.amount }))} emptyText="Sin cuentas por pagar" />

      <div className={`rounded-xl border p-4 ${net >= 0 ? 'bg-success/5 border-success/20' : 'bg-danger/5 border-danger/20'}`}>
        <div className="flex items-center justify-between">
          <span className="font-semibold">Resultado neto</span>
          <span className={`text-2xl font-bold ${net >= 0 ? 'text-success' : 'text-danger'}`}>{formatMXN(net)}</span>
        </div>
      </div>

      <div className="rounded-xl border p-4 bg-accent/5 border-accent/20">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-accent">Flujo de caja</span>
          <span className={`text-2xl font-bold ${net >= 0 ? 'text-accent' : 'text-danger'}`}>{formatMXN(net)}</span>
        </div>
        <p className="text-xs text-muted mt-1">Efectivo acumulado al final del mes</p>
      </div>

      {data.accountProjections.length > 0 && (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="bg-accent/5 px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-sm text-accent">Proyección por cuenta a fin de mes</h3>
          </div>
          <div className="divide-y divide-border">
            {data.accountProjections.map(ap => (
              <div key={ap.account.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ap.account.color }} />
                  <span className="text-sm">{ap.account.alias}</span>
                  <span className="text-xs text-muted">{ap.account.institution}</span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted">Actual: {formatMXN(ap.balance)}</p>
                  <p className={`text-sm font-bold ${ap.projected >= 0 ? 'text-accent' : 'text-danger'}`}>
                    Proyectado: {formatMXN(ap.projected)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, color, items, emptyText }: {
  title: string
  color: 'success' | 'danger'
  items: { label: string; amount: number }[]
  emptyText?: string
}) {
  const total = items.reduce((s, r) => s + r.amount, 0)
  const bg = color === 'success' ? 'bg-success/5' : 'bg-danger/5'
  const textColor = color === 'success' ? 'text-success' : 'text-danger'

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      <div className={`${bg} px-4 py-3 border-b border-border`}>
        <h3 className={`font-semibold text-sm ${textColor}`}>{title}</h3>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted p-4">{emptyText || 'Sin registros'}</p>
      ) : (
        <div className="divide-y divide-border">
          {items.map((r, i) => (
            <div key={`${r.label}-${i}`} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm">{r.label}</span>
              <span className={`text-sm font-medium ${textColor}`}>{formatMXN(r.amount)}</span>
            </div>
          ))}
          <div className={`flex items-center justify-between px-4 py-3 ${bg}`}>
            <span className="text-sm font-semibold">Total</span>
            <span className={`text-sm font-bold ${textColor}`}>{formatMXN(total)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function MultiMonthView({ monthsData }: { monthsData: { month: Date; data: MonthData }[] }) {
  const allFixedIncome = [...new Set(monthsData.flatMap(md => md.data.fixedIncome.map(r => r.description)))]
  const fixedExpenseMap = new Map<string, string>()
  monthsData.forEach(md => md.data.fixedExpenses.forEach(r => {
    if (!fixedExpenseMap.has(r.id)) fixedExpenseMap.set(r.id, r.description)
  }))
  const allFixedExpenseIds = [...fixedExpenseMap.keys()]
  const allSporadicIncome = [...new Set(monthsData.flatMap(md => md.data.sporadicIncome.map(r => r.category)))]
  const sporadicExpenseCategories = [...new Set(monthsData.flatMap(md => md.data.sporadicExpenses.map(r => r.category)))]
  const allReceivables = [...new Set(monthsData.flatMap(md => md.data.receivables.map(r => r.person)))]
  const allPayables = [...new Set(monthsData.flatMap(md => md.data.payables.map(r => r.person)))]
  const allAccounts = [...new Set(monthsData.flatMap(md => md.data.accountProjections.map(ap => ap.account.id)))]
  const accountMap = Object.fromEntries(monthsData.flatMap(md => md.data.accountProjections.map(ap => [ap.account.id, ap.account])))

  const now = new Date()

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-border">
            <th className="text-left px-4 py-3 font-semibold text-foreground sticky left-0 bg-gray-50 min-w-[200px]">Concepto</th>
            {monthsData.map(md => (
              <th key={md.month.toISOString()} className={`text-right px-4 py-3 font-semibold min-w-[120px] capitalize ${
                isSameMonth(md.month, now) ? 'text-accent' : 'text-foreground'
              }`}>
                {format(md.month, 'MMM yy', { locale: es })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <GroupHeader label="Ingresos fijos" color="success" colSpan={monthsData.length + 1} />
          {allFixedIncome.map(desc => (
            <DataRow key={desc} label={desc} values={monthsData.map(md =>
              md.data.fixedIncome.find(r => r.description === desc)?.amount ?? 0
            )} color="success" now={now} months={monthsData.map(m => m.month)} />
          ))}
          <TotalRow label="Subtotal" values={monthsData.map(md =>
            md.data.fixedIncome.reduce((s, r) => s + r.amount, 0)
          )} color="success" />

          {allSporadicIncome.length > 0 && (
            <>
              <GroupHeader label="Ingresos esporádicos" color="success" colSpan={monthsData.length + 1} />
              {allSporadicIncome.map(cat => (
                <DataRow key={cat} label={cat} values={monthsData.map(md =>
                  md.data.sporadicIncome.find(r => r.category === cat)?.amount ?? 0
                )} color="success" now={now} months={monthsData.map(m => m.month)} />
              ))}
              <TotalRow label="Subtotal" values={monthsData.map(md =>
                md.data.sporadicIncome.reduce((s, r) => s + r.amount, 0)
              )} color="success" />
            </>
          )}

          {allReceivables.length > 0 && (
            <>
              <GroupHeader label="Cuentas por cobrar" color="success" colSpan={monthsData.length + 1} />
              {allReceivables.map(person => (
                <DataRow key={person} label={person} values={monthsData.map(md =>
                  md.data.receivables.find(r => r.person === person)?.amount ?? 0
                )} color="success" now={now} months={monthsData.map(m => m.month)} />
              ))}
              <TotalRow label="Subtotal" values={monthsData.map(md =>
                md.data.receivables.reduce((s, r) => s + r.amount, 0)
              )} color="success" />
            </>
          )}

          <TotalRow label="Total ingresos" values={monthsData.map(md => md.data.totalIncome)} color="success" bold />

          <GroupHeader label="Gastos fijos" color="danger" colSpan={monthsData.length + 1} />
          {allFixedExpenseIds.map(id => (
            <DataRow key={id} label={fixedExpenseMap.get(id)!} values={monthsData.map(md =>
              md.data.fixedExpenses.find(r => r.id === id)?.amount ?? 0
            )} color="danger" now={now} months={monthsData.map(m => m.month)} />
          ))}
          <TotalRow label="Subtotal" values={monthsData.map(md =>
            md.data.fixedExpenses.reduce((s, r) => s + r.amount, 0)
          )} color="danger" />

          {sporadicExpenseCategories.length > 0 && (
            <>
              <GroupHeader label="Gastos esporádicos" color="danger" colSpan={monthsData.length + 1} />
              {sporadicExpenseCategories.map(cat => (
                <DataRow key={cat} label={cat} values={monthsData.map(md =>
                  md.data.sporadicExpenses.filter(r => r.category === cat).reduce((s, r) => s + r.amount, 0)
                )} color="danger" now={now} months={monthsData.map(m => m.month)} />
              ))}
              <TotalRow label="Subtotal" values={monthsData.map(md =>
                md.data.sporadicExpenses.reduce((s, r) => s + r.amount, 0)
              )} color="danger" />
            </>
          )}

          {allPayables.length > 0 && (
            <>
              <GroupHeader label="Cuentas por pagar" color="danger" colSpan={monthsData.length + 1} />
              {allPayables.map(person => (
                <DataRow key={person} label={person} values={monthsData.map(md =>
                  md.data.payables.find(r => r.person === person)?.amount ?? 0
                )} color="danger" now={now} months={monthsData.map(m => m.month)} />
              ))}
              <TotalRow label="Subtotal" values={monthsData.map(md =>
                md.data.payables.reduce((s, r) => s + r.amount, 0)
              )} color="danger" />
            </>
          )}

          <TotalRow label="Total gastos" values={monthsData.map(md => md.data.totalExpense)} color="danger" bold />

          <tr className="border-t-2 border-border bg-gray-50">
            <td className="px-4 py-3 font-bold sticky left-0 bg-gray-50">Resultado neto</td>
            {monthsData.map((md, i) => (
              <td key={i} className={`text-right px-4 py-3 font-bold ${md.data.net >= 0 ? 'text-success' : 'text-danger'}`}>
                {formatMXN(md.data.net)}
              </td>
            ))}
          </tr>

          {(() => {
            let cumulative = 0
            return (
              <tr className="border-t border-border bg-accent/5">
                <td className="px-4 py-3 font-bold sticky left-0 bg-accent/5 text-accent">Flujo de caja</td>
                {monthsData.map((md, i) => {
                  cumulative += md.data.net
                  return (
                    <td key={i} className={`text-right px-4 py-3 font-bold ${cumulative >= 0 ? 'text-accent' : 'text-danger'}`}>
                      {formatMXN(cumulative)}
                    </td>
                  )
                })}
              </tr>
            )
          })()}

          {allAccounts.length > 0 && (
            <>
              <GroupHeader label="Proyección por cuenta" color="accent" colSpan={monthsData.length + 1} />
              {allAccounts.map(accountId => {
                const account = accountMap[accountId]
                return (
                  <tr key={accountId} className="border-t border-border">
                    <td className="px-4 py-2 sticky left-0 bg-white">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: account.color }} />
                        <span className="text-sm truncate">{account.alias}</span>
                      </div>
                    </td>
                    {monthsData.map((md, i) => {
                      const ap = md.data.accountProjections.find(a => a.account.id === accountId)
                      const val = ap?.projected ?? 0
                      return (
                        <td key={i} className={`text-right px-4 py-2 text-sm font-medium ${val >= 0 ? 'text-accent' : 'text-danger'}`}>
                          {formatMXN(val)}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </>
          )}
        </tbody>
      </table>
    </div>
  )
}

function GroupHeader({ label, color, colSpan }: { label: string; color: string; colSpan: number }) {
  const bgMap: Record<string, string> = { success: 'bg-success/5', danger: 'bg-danger/5', accent: 'bg-accent/5' }
  const textMap: Record<string, string> = { success: 'text-success', danger: 'text-danger', accent: 'text-accent' }
  return (
    <tr className={bgMap[color] || 'bg-gray-50'}>
      <td colSpan={colSpan} className={`px-4 py-2 font-semibold text-xs uppercase tracking-wide ${textMap[color] || ''} sticky left-0 ${bgMap[color] || 'bg-gray-50'}`}>
        {label}
      </td>
    </tr>
  )
}

function DataRow({ label, values, color, now, months }: {
  label: string; values: number[]; color: string; now: Date; months: Date[]
}) {
  const textColor = color === 'success' ? 'text-success' : 'text-danger'
  return (
    <tr className="border-t border-border/50">
      <td className="px-4 py-2 text-sm sticky left-0 bg-white">{label}</td>
      {values.map((v, i) => (
        <td key={i} className={`text-right px-4 py-2 text-sm ${v > 0 ? textColor : 'text-muted'} ${
          isSameMonth(months[i], now) ? 'font-medium' : ''
        }`}>
          {v > 0 ? formatMXN(v) : '-'}
        </td>
      ))}
    </tr>
  )
}

function TotalRow({ label, values, color, bold }: {
  label: string; values: number[]; color: string; bold?: boolean
}) {
  const textColor = color === 'success' ? 'text-success' : 'text-danger'
  const bg = bold ? 'bg-gray-50' : ''
  return (
    <tr className={`border-t border-border ${bg}`}>
      <td className={`px-4 py-2 ${bold ? 'font-bold' : 'font-semibold'} text-sm sticky left-0 ${bg || 'bg-white'}`}>{label}</td>
      {values.map((v, i) => (
        <td key={i} className={`text-right px-4 py-2 text-sm ${bold ? 'font-bold' : 'font-semibold'} ${textColor}`}>
          {formatMXN(v)}
        </td>
      ))}
    </tr>
  )
}
