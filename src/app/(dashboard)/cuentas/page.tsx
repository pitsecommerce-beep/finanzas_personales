'use client'

import { useState } from 'react'
import { Plus, Trash2, Check, ArrowDownLeft, ArrowUpRight, CalendarDays } from 'lucide-react'
import { useAccounts } from '@/lib/hooks/use-accounts'
import { useToast } from '@/components/ui/toast'
import { formatMXN } from '@/lib/utils/currency'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { AccountType } from '@/types/database'

export default function CuentasPage() {
  const { accounts, loading, addAccount, updateAccount, deleteAccount } = useAccounts()
  const { toast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<'all' | 'receivable' | 'payable'>('all')

  const [form, setForm] = useState({
    type: 'receivable' as AccountType,
    person_name: '',
    description: '',
    amount: '',
    due_date: '',
    is_paid: false,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.person_name || !form.amount) return

    const result = await addAccount({
      type: form.type,
      person_name: form.person_name,
      description: form.description,
      amount: parseFloat(form.amount),
      due_date: form.due_date || null,
      is_paid: false,
    })

    if (result && 'error' in result && result.error) {
      toast('Error al guardar', 'error')
    } else {
      toast('Cuenta agregada', 'success')
      setForm({ type: 'receivable', person_name: '', description: '', amount: '', due_date: '', is_paid: false })
      setShowForm(false)
    }
  }

  async function togglePaid(id: string, currentValue: boolean) {
    const result = await updateAccount(id, { is_paid: !currentValue })
    if (result && 'error' in result && result.error) {
      toast('Error al actualizar', 'error')
    }
  }

  async function handleDelete(id: string) {
    const result = await deleteAccount(id)
    if (result?.error) {
      toast('Error al eliminar', 'error')
    }
  }

  const filtered = accounts.filter((a) => {
    if (filter === 'all') return true
    return a.type === filter
  })

  const totalReceivable = accounts.filter((a) => a.type === 'receivable' && !a.is_paid).reduce((s, a) => s + Number(a.amount), 0)
  const totalPayable = accounts.filter((a) => a.type === 'payable' && !a.is_paid).reduce((s, a) => s + Number(a.amount), 0)

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
          <h1 className="text-2xl font-bold">Cuentas</h1>
          <p className="text-sm text-muted">Por cobrar y por pagar</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-hover transition"
        >
          <Plus size={16} />
          Nueva cuenta
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-1">
            <ArrowDownLeft size={16} className="text-success" />
            <span className="text-xs text-muted">Por cobrar</span>
          </div>
          <p className="text-lg font-bold text-success">{formatMXN(totalReceivable)}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-1">
            <ArrowUpRight size={16} className="text-danger" />
            <span className="text-xs text-muted">Por pagar</span>
          </div>
          <p className="text-lg font-bold text-danger">{formatMXN(totalPayable)}</p>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-border p-4 space-y-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setForm({ ...form, type: 'receivable' })}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                form.type === 'receivable' ? 'bg-success/10 text-success border border-success/30' : 'bg-gray-50 text-muted border border-border'
              }`}
            >
              Por cobrar
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, type: 'payable' })}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                form.type === 'payable' ? 'bg-danger/10 text-danger border border-danger/30' : 'bg-gray-50 text-muted border border-border'
              }`}
            >
              Por pagar
            </button>
          </div>

          <input
            type="text"
            placeholder={form.type === 'receivable' ? 'Nombre de quien te debe' : 'Nombre a quien le debes'}
            value={form.person_name}
            onChange={(e) => setForm({ ...form, person_name: e.target.value })}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            required
          />

          <input
            type="text"
            placeholder="Descripcion (opcional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />

          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              placeholder="Monto"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              step="0.01"
              min="0"
              required
            />
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-hover transition"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg text-sm text-muted hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="flex gap-1 bg-white rounded-lg border border-border p-1">
        {[
          { value: 'all' as const, label: 'Todas' },
          { value: 'receivable' as const, label: 'Por cobrar' },
          { value: 'payable' as const, label: 'Por pagar' },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition ${
              filter === f.value ? 'bg-accent text-white' : 'text-muted hover:text-foreground'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted py-8">No hay cuentas registradas</p>
        )}
        {filtered.map((account) => (
          <div
            key={account.id}
            className={`bg-white rounded-xl border border-border p-4 flex items-center gap-3 ${
              account.is_paid ? 'opacity-60' : ''
            }`}
          >
            <button
              onClick={() => togglePaid(account.id, account.is_paid)}
              className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${
                account.is_paid
                  ? 'bg-success border-success text-white'
                  : 'border-border hover:border-accent'
              }`}
            >
              {account.is_paid && <Check size={14} />}
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                  account.type === 'receivable'
                    ? 'bg-success/10 text-success'
                    : 'bg-danger/10 text-danger'
                }`}>
                  {account.type === 'receivable' ? 'Por cobrar' : 'Por pagar'}
                </span>
                <span className="text-sm font-medium truncate">{account.person_name}</span>
              </div>
              {account.description && (
                <p className="text-xs text-muted truncate mt-0.5">{account.description}</p>
              )}
              {account.due_date && (
                <div className="flex items-center gap-1 mt-1 text-xs text-muted">
                  <CalendarDays size={12} />
                  <span>{format(new Date(account.due_date), "d 'de' MMMM yyyy", { locale: es })}</span>
                </div>
              )}
            </div>

            <p className={`text-sm font-bold shrink-0 ${
              account.type === 'receivable' ? 'text-success' : 'text-danger'
            }`}>
              {formatMXN(Number(account.amount))}
            </p>

            <button
              onClick={() => handleDelete(account.id)}
              className="shrink-0 p-1.5 text-muted hover:text-danger rounded-lg hover:bg-danger/5 transition"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
