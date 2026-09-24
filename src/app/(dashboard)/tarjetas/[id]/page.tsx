'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { formatMXN } from '@/lib/utils/currency'
import { getNextPaymentDate, getNextCutOffDate, getClosedBillingPeriod, daysUntil } from '@/lib/utils/dates'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowLeft, CalendarDays, Upload } from 'lucide-react'
import { TransactionList } from '@/components/transactions/transaction-list'
import { TransactionForm } from '@/components/transactions/transaction-form'
import { InvestmentDetail } from '@/components/cards/investment-detail'
import { StatementPreview, type StatementAnalysis } from '@/components/cards/statement-preview'
import { Modal } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/components/ui/toast'
import type { Account, AccountBalance, LedgerEntry, InstallmentPlan } from '@/types/database'

export default function CardDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { toast } = useToast()
  const [account, setAccount] = useState<Account | null>(null)
  const [balance, setBalance] = useState<AccountBalance | null>(null)
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [installments, setInstallments] = useState<InstallmentPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null)
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null)
  const [statementAnalysis, setStatementAnalysis] = useState<StatementAnalysis | null>(null)
  const [analyzingPdf, setAnalyzingPdf] = useState(false)
  const [savingStatement, setSavingStatement] = useState(false)
  const [nextPaymentTotal, setNextPaymentTotal] = useState<number | null>(null)

  const loadData = useCallback(async () => {
    if (!isSupabaseConfigured()) { setLoading(false); return }
    const supabase = createClient()

    const accountRes = await supabase.from('accounts').select('*').eq('id', id).single()
    const acct = accountRes.data
    setAccount(acct)
    if (!acct) { setLoading(false); return }

    const isCreditWithCutOff = acct.account_type === 'credit_card' && acct.cut_off_day != null

    const [balanceRes, entriesRes, installRes, billingRes] = await Promise.all([
      supabase.from('v_account_balances').select('*').eq('account_id', id).single(),
      supabase.from('ledger_entries').select('*, account:accounts(*), category:categories(*)').eq('account_id', id).is('deleted_at', null).order('occurred_on', { ascending: false }).limit(50),
      supabase.from('installment_plans').select('*').eq('account_id', id).eq('is_active', true),
      isCreditWithCutOff
        ? (() => {
            const closed = getClosedBillingPeriod(acct.cut_off_day!)
            return supabase.from('ledger_entries')
              .select('id, entry_type, amount')
              .eq('account_id', id)
              .is('deleted_at', null)
              .not('entry_type', 'eq', 'transfer')
              .gte('occurred_on', format(closed.start, 'yyyy-MM-dd'))
              .lte('occurred_on', format(closed.end, 'yyyy-MM-dd'))
          })()
        : Promise.resolve({ data: null }),
    ])

    setBalance(balanceRes.data)
    setEntries(entriesRes.data ?? [])
    setInstallments(installRes.data ?? [])

    if (billingRes.data) {
      const total = (billingRes.data as { entry_type: string; amount: number }[])
        .filter(e => e.entry_type === 'expense')
        .reduce((sum, e) => sum + Math.abs(Number(e.amount)), 0)
      setNextPaymentTotal(total)
    } else {
      setNextPaymentTotal(null)
    }

    setLoading(false)
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleDelete() {
    if (!deleteEntryId) return
    const supabase = createClient()
    const { error } = await supabase
      .from('ledger_entries')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', deleteEntryId)

    if (error) {
      toast('Error al eliminar', 'error')
    } else {
      toast('Movimiento eliminado', 'success')
      await loadData()
    }
    setDeleteEntryId(null)
  }

  function handleEditSuccess() {
    setEditingEntry(null)
    loadData()
  }

  async function handlePdfUpload(file: File) {
    setAnalyzingPdf(true)
    try {
      const buffer = await file.arrayBuffer()
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      )

      const res = await fetch('/api/statement/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdf_base64: base64, account_id: id }),
      })

      if (!res.ok) {
        const err = await res.json()
        toast(err.error || 'Error al analizar el PDF', 'error')
        return
      }

      const data = await res.json()
      setStatementAnalysis(data.analysis)
    } catch {
      toast('Error al procesar el archivo', 'error')
    } finally {
      setAnalyzingPdf(false)
    }
  }

  async function handleConfirmStatement() {
    if (!statementAnalysis) return
    setSavingStatement(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast('No autorizado', 'error'); return }

      const { data: stmt, error: stmtErr } = await supabase
        .from('card_statements')
        .insert({
          account_id: id,
          user_id: user.id,
          period_start: statementAnalysis.period_start,
          period_end: statementAnalysis.period_end,
          payment_due_date: statementAnalysis.payment_due_date,
          total_amount: statementAnalysis.total_amount,
          minimum_payment: statementAnalysis.minimum_payment,
          no_interest_payment: statementAnalysis.no_interest_payment,
        })
        .select()
        .single()

      if (stmtErr) {
        toast('Error al guardar el estado de cuenta', 'error')
        console.error(stmtErr)
        return
      }

      const regularTx = statementAnalysis.transactions.filter(t => !t.is_msi)
      if (regularTx.length > 0) {
        const entries = regularTx.map(tx => ({
          user_id: user.id,
          account_id: id,
          entry_type: 'expense' as const,
          amount: -Math.abs(tx.amount),
          description: tx.description,
          occurred_on: tx.date,
          source: 'import' as const,
          currency: 'MXN',
          statement_id: stmt.id,
        }))

        const { error: txErr } = await supabase.from('ledger_entries').insert(entries)
        if (txErr) console.error('Error al insertar transacciones:', txErr)
      }

      for (const ip of statementAnalysis.installment_summary) {
        const endDate = new Date(statementAnalysis.period_end + 'T12:00:00')
        endDate.setMonth(endDate.getMonth() + ip.remaining_months)

        const { data: plan, error: ipErr } = await supabase
          .from('installment_plans')
          .insert({
            user_id: user.id,
            account_id: id,
            description: ip.description,
            total_amount: ip.total_amount,
            monthly_amount: ip.monthly_amount,
            total_months: ip.total_months,
            remaining_months: ip.remaining_months,
            start_date: ip.start_date,
            end_date: endDate.toISOString().slice(0, 10),
            currency: 'MXN',
            is_active: ip.remaining_months > 0,
          })
          .select()
          .single()

        if (ipErr) {
          console.error('Error al insertar plan MSI:', ipErr)
          continue
        }

        if (plan) {
          await supabase.from('ledger_entries').insert({
            user_id: user.id,
            account_id: id,
            entry_type: 'expense' as const,
            amount: -Math.abs(ip.monthly_amount),
            description: `MSI: ${ip.description}`,
            occurred_on: statementAnalysis.period_end,
            source: 'import' as const,
            currency: 'MXN',
            statement_id: stmt.id,
            installment_plan_id: plan.id,
          })
        }
      }

      toast('Estado de cuenta registrado', 'success')
      setStatementAnalysis(null)
      await loadData()
    } catch {
      toast('Error al guardar', 'error')
    } finally {
      setSavingStatement(false)
    }
  }

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

      {isCredit && (
        <div className="flex gap-2">
          <label className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition ${analyzingPdf ? 'bg-gray-100 text-muted' : 'bg-accent/10 text-accent hover:bg-accent/20'}`}>
            {analyzingPdf ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-accent border-t-transparent rounded-full" />
                Analizando PDF...
              </>
            ) : (
              <>
                <Upload size={16} />
                Cargar estado de cuenta
              </>
            )}
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              disabled={analyzingPdf}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handlePdfUpload(file)
                e.target.value = ''
              }}
            />
          </label>
        </div>
      )}

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

      {isCredit && nextPaymentTotal != null && nextPayment && account.cut_off_day != null && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-red-600 mb-1">Total a pagar</p>
              <p className="text-2xl font-bold text-red-700">{formatMXN(nextPaymentTotal + fixedMonthly)}</p>
              {fixedMonthly > 0 && (
                <p className="text-xs text-muted mt-1">
                  Compras: {formatMXN(nextPaymentTotal)} + MSI: {formatMXN(fixedMonthly)}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-red-600">Pagar antes del</p>
              <p className="text-sm font-semibold text-red-800">
                {format(nextPayment, "d 'de' MMMM", { locale: es })}
              </p>
              <p className="text-xs text-red-500 mt-0.5">En {daysUntil(nextPayment)} días</p>
            </div>
          </div>
        </div>
      )}

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
        <TransactionList
          entries={entries}
          onEdit={(entry) => setEditingEntry(entry)}
          onDelete={(entryId) => setDeleteEntryId(entryId)}
        />
      </div>

      <Modal
        open={!!editingEntry}
        onClose={() => setEditingEntry(null)}
        title="Editar movimiento"
      >
        {editingEntry && (
          <TransactionForm
            type={editingEntry.entry_type === 'income' ? 'income' : 'expense'}
            entry={editingEntry}
            onSuccess={handleEditSuccess}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteEntryId}
        title="Eliminar movimiento"
        message="Esta acción no se puede deshacer. ¿Deseas continuar?"
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        onCancel={() => setDeleteEntryId(null)}
      />

      <Modal
        open={!!statementAnalysis}
        onClose={() => setStatementAnalysis(null)}
        title="Estado de cuenta"
      >
        {statementAnalysis && (
          <StatementPreview
            analysis={statementAnalysis}
            accountAlias={account.alias}
            onConfirm={handleConfirmStatement}
            onCancel={() => setStatementAnalysis(null)}
            loading={savingStatement}
          />
        )}
      </Modal>
    </div>
  )
}
