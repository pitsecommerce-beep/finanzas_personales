'use client'

import { useState } from 'react'
import { Plus, Trash2, Check, ArrowDownLeft, ArrowUpRight, CalendarDays, Pencil } from 'lucide-react'
import { useAccounts } from '@/lib/hooks/use-accounts'
import { useCards } from '@/lib/hooks/use-cards'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Modal } from '@/components/ui/modal'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { formatMXN } from '@/lib/utils/currency'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import type { Account, AccountType } from '@/types/database'

export default function CuentasPage() {
  const { accounts, loading, addAccount, updateAccount, deleteAccount } = useAccounts()
  const { cards } = useCards()
  const { toast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [filter, setFilter] = useState<'all' | 'receivable' | 'payable'>('all')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [payAccount, setPayAccount] = useState<Account | null>(null)
  const [selectedCardId, setSelectedCardId] = useState('')
  const [payLoading, setPayLoading] = useState(false)

  const emptyForm = {
    type: 'receivable' as AccountType,
    person_name: '',
    description: '',
    amount: '',
    due_date: '',
    is_paid: false,
  }

  const [form, setForm] = useState(emptyForm)

  function openCreate() {
    setEditingAccount(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  function openEdit(account: Account) {
    setEditingAccount(account)
    setForm({
      type: account.type,
      person_name: account.person_name,
      description: account.description,
      amount: account.amount.toString(),
      due_date: account.due_date ?? '',
      is_paid: account.is_paid,
    })
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.person_name || !form.amount) return

    if (editingAccount) {
      const result = await updateAccount(editingAccount.id, {
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
        setEditingAccount(null)
        setShowForm(false)
      }
      return
    }

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
      setForm(emptyForm)
      setShowForm(false)
    }
  }

  function handleTogglePaid(account: Account) {
    if (account.is_paid) {
      updateAccount(account.id, { is_paid: false })
      return
    }
    setPayAccount(account)
    setSelectedCardId('')
  }

  async function confirmPay() {
    if (!payAccount) return
    setPayLoading(true)

    const result = await updateAccount(payAccount.id, { is_paid: true })
    if (result && 'error' in result && result.error) {
      toast('Error al actualizar', 'error')
      setPayLoading(false)
      return
    }

    if (selectedCardId) {
      const supabase = createClient()
      const card = cards.find(c => c.id === selectedCardId)
      if (card) {
        const amount = Number(payAccount.amount)
        if (payAccount.type === 'receivable') {
          const newBalance = (card.balance ?? 0) + amount
          await supabase.from('cards').update({ balance: newBalance }).eq('id', selectedCardId)
        } else {
          if (card.card_type === 'credit') {
            const newUsed = (card.used_credit ?? 0) + amount
            await supabase.from('cards').update({ used_credit: newUsed }).eq('id', selectedCardId)
          } else {
            const newBalance = (card.balance ?? 0) - amount
            await supabase.from('cards').update({ balance: newBalance }).eq('id', selectedCardId)
          }
        }
      }
    }

    const label = payAccount.type === 'receivable' ? 'Cobro registrado' : 'Pago registrado'
    toast(label, 'success')
    setPayAccount(null)
    setPayLoading(false)
  }

  function handleDelete(id: string) {
    setDeleteId(id)
  }

  async function confirmDelete() {
    if (!deleteId) return
    const result = await deleteAccount(deleteId)
    if (result?.error) {
      toast('Error al eliminar', 'error')
    } else {
      toast('Cuenta eliminada', 'success')
    }
    setDeleteId(null)
  }

  const filtered = accounts.filter((a) => {
    if (filter === 'all') return true
    return a.type === filter
  })

  const totalReceivable = accounts.filter((a) => a.type === 'receivable' && !a.is_paid).reduce((s, a) => s + Number(a.amount), 0)
  const totalPayable = accounts.filter((a) => a.type === 'payable' && !a.is_paid).reduce((s, a) => s + Number(a.amount), 0)

  const cardOptions = payAccount?.type === 'receivable'
    ? cards.filter(c => c.card_type !== 'credit').map(c => ({ value: c.id, label: `${c.alias} (${c.bank_name})` }))
    : cards.map(c => ({ value: c.id, label: `${c.alias} (${c.bank_name})` }))

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
            placeholder="Descripción (opcional)"
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
              {editingAccount ? 'Guardar cambios' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditingAccount(null) }}
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
              onClick={() => handleTogglePaid(account)}
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
              onClick={() => openEdit(account)}
              className="shrink-0 p-1.5 text-muted hover:text-accent rounded-lg hover:bg-accent/5 transition"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => handleDelete(account.id)}
              className="shrink-0 p-1.5 text-muted hover:text-danger rounded-lg hover:bg-danger/5 transition"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <Modal
        open={!!payAccount}
        onClose={() => setPayAccount(null)}
        title={payAccount?.type === 'receivable' ? 'Registrar cobro' : 'Registrar pago'}
      >
        {payAccount && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm">
                <span className="font-medium">{payAccount.person_name}</span>
                {payAccount.description && <span className="text-muted"> - {payAccount.description}</span>}
              </p>
              <p className={`text-lg font-bold mt-1 ${payAccount.type === 'receivable' ? 'text-success' : 'text-danger'}`}>
                {formatMXN(Number(payAccount.amount))}
              </p>
            </div>

            <Select
              id="payCard"
              label={payAccount.type === 'receivable' ? '¿A qué cuenta se depositó?' : '¿De qué cuenta se pagó?'}
              value={selectedCardId}
              onChange={(e) => setSelectedCardId(e.target.value)}
              options={cardOptions}
              placeholder="Selecciona una cuenta"
            />

            <p className="text-xs text-muted">
              {payAccount.type === 'receivable'
                ? 'Se sumará el monto al saldo de la cuenta seleccionada.'
                : 'Se descontará el monto del saldo de la cuenta seleccionada.'}
            </p>

            <div className="flex gap-2">
              <Button onClick={confirmPay} loading={payLoading} className="flex-1">
                {payAccount.type === 'receivable' ? 'Confirmar cobro' : 'Confirmar pago'}
              </Button>
              <button
                onClick={() => setPayAccount(null)}
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
