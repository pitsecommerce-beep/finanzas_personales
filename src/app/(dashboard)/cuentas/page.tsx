'use client'

import { useState } from 'react'
import { Plus, Trash2, Check, ArrowDownLeft, ArrowUpRight, CalendarDays, Pencil } from 'lucide-react'
import { useDebts } from '@/lib/data/debts'
import { useAccounts } from '@/lib/data/accounts'
import { useLedger } from '@/lib/data/ledger'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Modal } from '@/components/ui/modal'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { formatMXN } from '@/lib/utils/currency'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { todayMX } from '@/lib/utils/dates'
import type { Debt, DebtType } from '@/types/database'

export default function CuentasPage() {
  const { debts, loading, addDebt, updateDebt, deleteDebt } = useDebts()
  const { accounts } = useAccounts()
  const { addEntry } = useLedger()
  const { toast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null)
  const [filter, setFilter] = useState<'all' | 'receivable' | 'payable'>('all')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [payDebt, setPayDebt] = useState<Debt | null>(null)
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [payLoading, setPayLoading] = useState(false)

  const emptyForm = {
    type: 'receivable' as DebtType,
    person_name: '',
    description: '',
    amount: '',
    due_date: todayMX(),
    is_paid: false,
  }

  const [form, setForm] = useState(emptyForm)

  function openCreate() {
    setEditingDebt(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  function openEdit(debt: Debt) {
    setEditingDebt(debt)
    setForm({
      type: debt.type,
      person_name: debt.person_name,
      description: debt.description,
      amount: debt.amount.toString(),
      due_date: debt.due_date ?? '',
      is_paid: debt.is_paid,
    })
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.person_name || !form.amount) return

    if (editingDebt) {
      const result = await updateDebt(editingDebt.id, {
        type: form.type,
        person_name: form.person_name,
        description: form.description,
        amount: parseFloat(form.amount),
        due_date: form.due_date || null,
      })
      if (result && 'error' in result && result.error) {
        toast('Error al actualizar', 'error')
      } else {
        toast('Cuenta actualizada', 'success')
        setForm(emptyForm)
        setEditingDebt(null)
        setShowForm(false)
      }
      return
    }

    const result = await addDebt({
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
      setForm(emptyForm)
      setShowForm(false)
    }
  }

  function handleTogglePaid(debt: Debt) {
    if (debt.is_paid) {
      updateDebt(debt.id, { is_paid: false })
      return
    }
    setPayDebt(debt)
    setSelectedAccountId('')
  }

  async function confirmPay() {
    if (!payDebt) return
    setPayLoading(true)

    const result = await updateDebt(payDebt.id, { is_paid: true })
    if (result && 'error' in result && result.error) {
      toast('Error al actualizar', 'error')
      setPayLoading(false)
      return
    }

    if (selectedAccountId) {
      const amount = Number(payDebt.amount)
      const entryType = payDebt.type === 'receivable' ? 'income' : 'expense'
      const sign = payDebt.type === 'receivable' ? 1 : -1
      await addEntry({
        account_id: selectedAccountId,
        entry_type: entryType,
        amount: amount * sign,
        description: `${payDebt.type === 'receivable' ? 'Cobro' : 'Pago'}: ${payDebt.person_name}`,
        occurred_on: new Date().toISOString().slice(0, 10),
        source: 'app',
      })
    }

    const label = payDebt.type === 'receivable' ? 'Cobro registrado' : 'Pago registrado'
    toast(label, 'success')
    setPayDebt(null)
    setPayLoading(false)
  }

  function handleDelete(id: string) {
    setDeleteId(id)
  }

  async function confirmDelete() {
    if (!deleteId) return
    const result = await deleteDebt(deleteId)
    if (result?.error) {
      toast('Error al eliminar', 'error')
    } else {
      toast('Cuenta eliminada', 'success')
    }
    setDeleteId(null)
  }

  const filtered = debts
    .filter((d) => {
      if (filter === 'all') return true
      return d.type === filter
    })
    .sort((a, b) => Number(a.is_paid) - Number(b.is_paid))

  const totalReceivable = debts.filter((d) => d.type === 'receivable' && !d.is_paid).reduce((s, d) => s + Number(d.amount), 0)
  const totalPayable = debts.filter((d) => d.type === 'payable' && !d.is_paid).reduce((s, d) => s + Number(d.amount), 0)

  const accountOptions = payDebt?.type === 'receivable'
    ? accounts.filter(a => a.account_type !== 'credit_card').map(a => ({ value: a.id, label: `${a.alias} (${a.institution ?? ''})` }))
    : accounts.map(a => ({ value: a.id, label: `${a.alias} (${a.institution ?? ''})` }))

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
          onClick={openCreate}
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

      <Modal
        open={showForm}
        onClose={() => { setShowForm(false); setEditingDebt(null) }}
        title={editingDebt ? 'Editar cuenta' : 'Nueva cuenta'}
      >
        <form onSubmit={handleSubmit} className="space-y-3">
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
            <Button type="submit" className="flex-1">
              {editingDebt ? 'Guardar cambios' : 'Guardar'}
            </Button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditingDebt(null) }}
              className="px-4 py-2 rounded-lg text-sm text-muted hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

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
        {filtered.map((debt) => (
          <div
            key={debt.id}
            className={`bg-white rounded-xl border border-border p-4 flex items-center gap-3 ${
              debt.is_paid ? 'opacity-60' : ''
            }`}
          >
            <button
              onClick={() => handleTogglePaid(debt)}
              className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${
                debt.is_paid
                  ? 'bg-success border-success text-white'
                  : 'border-border hover:border-accent'
              }`}
            >
              {debt.is_paid && <Check size={14} />}
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                  debt.type === 'receivable'
                    ? 'bg-success/10 text-success'
                    : 'bg-danger/10 text-danger'
                }`}>
                  {debt.type === 'receivable' ? 'Por cobrar' : 'Por pagar'}
                </span>
                <span className="text-sm font-medium truncate">{debt.person_name}</span>
              </div>
              {debt.description && (
                <p className="text-xs text-muted truncate mt-0.5">{debt.description}</p>
              )}
              {debt.due_date && (
                <div className="flex items-center gap-1 mt-1 text-xs text-muted">
                  <CalendarDays size={12} />
                  <span>{format(new Date(debt.due_date + 'T12:00:00'), "d 'de' MMMM yyyy", { locale: es })}</span>
                </div>
              )}
            </div>

            <p className={`text-sm font-bold shrink-0 ${
              debt.type === 'receivable' ? 'text-success' : 'text-danger'
            }`}>
              {formatMXN(Number(debt.amount))}
            </p>

            <button
              onClick={() => openEdit(debt)}
              className="shrink-0 p-1.5 text-muted hover:text-accent rounded-lg hover:bg-accent/5 transition"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => handleDelete(debt.id)}
              className="shrink-0 p-1.5 text-muted hover:text-danger rounded-lg hover:bg-danger/5 transition"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <Modal
        open={!!payDebt}
        onClose={() => setPayDebt(null)}
        title={payDebt?.type === 'receivable' ? 'Registrar cobro' : 'Registrar pago'}
      >
        {payDebt && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm">
                <span className="font-medium">{payDebt.person_name}</span>
                {payDebt.description && <span className="text-muted"> - {payDebt.description}</span>}
              </p>
              <p className={`text-lg font-bold mt-1 ${payDebt.type === 'receivable' ? 'text-success' : 'text-danger'}`}>
                {formatMXN(Number(payDebt.amount))}
              </p>
            </div>

            <Select
              id="payAccount"
              label={payDebt.type === 'receivable' ? '¿A qué cuenta se depositó?' : '¿De qué cuenta se pagó?'}
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              options={accountOptions}
              placeholder="Selecciona una cuenta"
            />

            <p className="text-xs text-muted">
              {payDebt.type === 'receivable'
                ? 'Se registrará un ingreso en la cuenta seleccionada.'
                : 'Se registrará un gasto en la cuenta seleccionada.'}
            </p>

            <div className="flex gap-2">
              <Button onClick={confirmPay} loading={payLoading} className="flex-1">
                {payDebt.type === 'receivable' ? 'Confirmar cobro' : 'Confirmar pago'}
              </Button>
              <button
                onClick={() => setPayDebt(null)}
                className="px-4 py-2 rounded-lg text-sm text-muted hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Eliminar cuenta"
        message="Esta acción no se puede deshacer. ¿Deseas continuar?"
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
