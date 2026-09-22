'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { useAccounts, useAccountBalances } from '@/lib/data/accounts'
import { CardItem } from '@/components/cards/card-item'
import { CardForm } from '@/components/cards/card-form'
import { Modal } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import type { Account, AccountType } from '@/types/database'

const TYPE_ORDER: AccountType[] = ['credit_card', 'debit', 'cash', 'savings', 'voucher', 'investment']

const TYPE_LABELS: Record<string, string> = {
  credit_card: 'Tarjetas de crédito',
  debit: 'Tarjetas de débito',
  cash: 'Efectivo',
  savings: 'Cuentas de ahorro',
  voucher: 'Vales',
  investment: 'Inversiones',
}

export default function TarjetasPage() {
  const router = useRouter()
  const { accounts, loading, deleteAccount, refetch } = useAccounts()
  const { balances } = useAccountBalances()
  const [showForm, setShowForm] = useState(false)
  const [editingCard, setEditingCard] = useState<Account | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { toast } = useToast()

  function handleEdit(card: Account) {
    setEditingCard(card)
  }

  function handleCloseForm() {
    setShowForm(false)
    setEditingCard(null)
  }

  async function confirmDelete() {
    if (!deleteId) return
    const { error } = await deleteAccount(deleteId)
    if (error) toast('Error al eliminar', 'error')
    else toast('Cuenta eliminada', 'success')
    setDeleteId(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    )
  }

  const grouped: Record<string, Account[]> = {}
  for (const account of accounts) {
    const type = account.account_type
    if (!grouped[type]) grouped[type] = []
    grouped[type].push(account)
  }

  const orderedTypes = TYPE_ORDER.filter(t => grouped[t]?.length)

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tarjetas y cuentas</h1>
          <p className="text-sm text-muted">{accounts.length} registros</p>
        </div>
        <Button onClick={() => setShowForm(true)} size="sm">
          <Plus size={16} /> Agregar
        </Button>
      </div>

      {accounts.length === 0 ? (
        <div className="text-center py-16 text-muted">
          <p className="text-4xl mb-3">💳</p>
          <p className="text-sm mb-4">Agrega tu primera tarjeta o registro de efectivo</p>
          <Button onClick={() => setShowForm(true)}>Agregar</Button>
        </div>
      ) : (
        <div className="space-y-6">
          {orderedTypes.map(type => (
            <div key={type}>
              <h2 className="font-semibold text-sm text-muted mb-3">{TYPE_LABELS[type] ?? type}</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {grouped[type].map((account) => (
                  <CardItem
                    key={account.id}
                    card={account}
                    balance={balances.find(b => b.account_id === account.id)}
                    onView={(c) => router.push(`/tarjetas/${c.id}`)}
                    onEdit={handleEdit}
                    onDelete={(id) => setDeleteId(id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={handleCloseForm} title="Nueva cuenta">
        <CardForm onSuccess={() => { handleCloseForm(); refetch() }} />
      </Modal>

      <Modal open={!!editingCard} onClose={handleCloseForm} title="Editar cuenta">
        {editingCard && (
          <CardForm card={editingCard} onSuccess={() => { handleCloseForm(); refetch() }} />
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
