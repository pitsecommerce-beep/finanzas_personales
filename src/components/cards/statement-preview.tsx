'use client'

import { useState } from 'react'
import { formatMXN } from '@/lib/utils/currency'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Check, X, CreditCard, Calendar, ShoppingCart, Clock } from 'lucide-react'

interface Transaction {
  date: string
  description: string
  amount: number
  is_msi: boolean
  msi_months: number | null
  msi_monthly_amount: number | null
  category_hint: string
}

interface InstallmentSummary {
  description: string
  total_amount: number
  monthly_amount: number
  total_months: number
  remaining_months: number
  start_date: string
}

export interface StatementAnalysis {
  period_start: string
  period_end: string
  payment_due_date: string
  total_amount: number | null
  minimum_payment: number | null
  no_interest_payment: number | null
  previous_balance: number | null
  payments_received: number | null
  new_purchases_total: number | null
  interest_charged: number | null
  fees_charged: number | null
  credit_limit: number | null
  available_credit: number | null
  transactions: Transaction[]
  installment_summary: InstallmentSummary[]
}

interface StatementPreviewProps {
  analysis: StatementAnalysis
  accountAlias: string
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A'
  try {
    return format(new Date(dateStr + 'T12:00:00'), "d 'de' MMMM yyyy", { locale: es })
  } catch {
    return dateStr
  }
}

export function StatementPreview({ analysis, accountAlias, onConfirm, onCancel, loading }: StatementPreviewProps) {
  const [showAllTx, setShowAllTx] = useState(false)

  const txToShow = showAllTx ? analysis.transactions : analysis.transactions.slice(0, 10)
  const msiTransactions = analysis.transactions.filter(t => t.is_msi)
  const regularTransactions = analysis.transactions.filter(t => !t.is_msi)

  const regularTotal = regularTransactions.reduce((sum, t) => sum + t.amount, 0)
  const msiMonthlyTotal = analysis.installment_summary.reduce((sum, i) => sum + i.monthly_amount, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Preliminar: {accountAlias}</h3>
        <span className="text-xs text-muted bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
          Sin guardar
        </span>
      </div>

      <p className="text-xs text-muted">
        Periodo: {formatDate(analysis.period_start)} al {formatDate(analysis.period_end)}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-border p-3">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard size={14} className="text-muted" />
            <p className="text-xs text-muted">Crédito utilizado</p>
          </div>
          <p className="text-base font-bold">
            {analysis.total_amount != null ? formatMXN(analysis.total_amount) : 'N/A'}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-border p-3">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard size={14} className="text-success" />
            <p className="text-xs text-muted">Crédito disponible</p>
          </div>
          <p className="text-base font-bold text-success">
            {analysis.available_credit != null ? formatMXN(analysis.available_credit) : 'N/A'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border p-4 space-y-2">
        <h4 className="font-semibold text-sm">Resumen de pagos</h4>
        <div className="grid grid-cols-1 gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Pago para no generar intereses</span>
            <span className="font-medium">{analysis.no_interest_payment != null ? formatMXN(analysis.no_interest_payment) : 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Pago mínimo</span>
            <span className="font-medium">{analysis.minimum_payment != null ? formatMXN(analysis.minimum_payment) : 'N/A'}</span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <Calendar size={14} className="text-danger" />
              <span className="text-muted">Fecha límite de pago</span>
            </div>
            <span className="font-medium text-danger">{formatDate(analysis.payment_due_date)}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border p-4 space-y-2">
        <h4 className="font-semibold text-sm">Desglose del periodo</h4>
        <div className="grid grid-cols-1 gap-2 text-sm">
          {analysis.previous_balance != null && (
            <div className="flex justify-between">
              <span className="text-muted">Saldo anterior</span>
              <span className="font-medium">{formatMXN(analysis.previous_balance)}</span>
            </div>
          )}
          {analysis.payments_received != null && (
            <div className="flex justify-between">
              <span className="text-muted">Pagos recibidos</span>
              <span className="font-medium text-success">{formatMXN(analysis.payments_received)}</span>
            </div>
          )}
          {analysis.new_purchases_total != null && (
            <div className="flex justify-between">
              <span className="text-muted">Compras nuevas</span>
              <span className="font-medium">{formatMXN(analysis.new_purchases_total)}</span>
            </div>
          )}
          {analysis.interest_charged != null && analysis.interest_charged > 0 && (
            <div className="flex justify-between">
              <span className="text-muted">Intereses</span>
              <span className="font-medium text-danger">{formatMXN(analysis.interest_charged)}</span>
            </div>
          )}
          {analysis.fees_charged != null && analysis.fees_charged > 0 && (
            <div className="flex justify-between">
              <span className="text-muted">Comisiones</span>
              <span className="font-medium text-danger">{formatMXN(analysis.fees_charged)}</span>
            </div>
          )}
        </div>
      </div>

      {analysis.installment_summary.length > 0 && (
        <div className="bg-white rounded-xl border border-border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-accent" />
            <h4 className="font-semibold text-sm">Meses sin intereses ({analysis.installment_summary.length})</h4>
          </div>
          <div className="space-y-2">
            {analysis.installment_summary.map((ip, i) => (
              <div key={i} className="flex justify-between text-sm border-b border-border pb-2 last:border-0 last:pb-0">
                <div>
                  <p className="font-medium">{ip.description}</p>
                  <p className="text-xs text-muted">
                    {ip.remaining_months} de {ip.total_months} meses restantes
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatMXN(ip.monthly_amount)}/mes</p>
                  <p className="text-xs text-muted">Total: {formatMXN(ip.total_amount)}</p>
                </div>
              </div>
            ))}
            <div className="border-t border-border pt-2 flex justify-between text-sm font-semibold">
              <span>Total mensual MSI</span>
              <span>{formatMXN(msiMonthlyTotal)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart size={14} className="text-muted" />
            <h4 className="font-semibold text-sm">Transacciones ({analysis.transactions.length})</h4>
          </div>
          <span className="text-xs text-muted">Total: {formatMXN(regularTotal)}</span>
        </div>
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {txToShow.map((tx, i) => (
            <div key={i} className="flex justify-between text-sm py-1 border-b border-border last:border-0">
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium">{tx.description}</p>
                <p className="text-xs text-muted">
                  {tx.date}
                  {tx.is_msi && ` · ${tx.msi_months} MSI`}
                </p>
              </div>
              <span className="font-medium ml-2 whitespace-nowrap">{formatMXN(tx.amount)}</span>
            </div>
          ))}
        </div>
        {analysis.transactions.length > 10 && (
          <button
            onClick={() => setShowAllTx(!showAllTx)}
            className="text-xs text-accent hover:underline"
          >
            {showAllTx ? 'Ver menos' : `Ver todas (${analysis.transactions.length})`}
          </button>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
        <p className="text-xs text-amber-700">
          Revisa que la información sea correcta antes de confirmar. Al confirmar se registrarán los movimientos y planes a meses en la base de datos.
        </p>
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
          className="flex-1"
        >
          <X size={16} className="mr-1" /> Cancelar
        </Button>
        <Button
          type="button"
          onClick={onConfirm}
          loading={loading}
          className="flex-1"
        >
          <Check size={16} className="mr-1" /> Confirmar y guardar
        </Button>
      </div>
    </div>
  )
}
