'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { useCards } from '@/lib/hooks/use-cards'
import { CardItem } from '@/components/cards/card-item'
import { CardForm } from '@/components/cards/card-form'
import { Modal } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import type { Card } from '@/types/database'

const TYPE_ORDER = ['credit', 'debit', 'cash', 'savings', 'voucher', 'investment'] as const

const TYPE_LABELS: Record<string, string> = {
  credit: 'Tarjetas de credito',
  debit: 'Tarjetas de debito',
  cash: 'Efectivo',
  savings: 'Cuentas de ahorro',
  voucher: 'Vales',
  investment: 'Inversiones',
}

export default function TarjetasPage() {
  const router = useRouter()
  const { cards, loading, deleteCard, refetch } = useCards()
  const [showForm, setShowForm] = useState(false)
  const [editingCard, setEditingCard] = useState<Card | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { toast } = useToast()

  function handleEdit(card: Card) {
    setEditingCard(card)
  }

  function handleCloseForm() {
    setShowForm(false)
    setEditingCard(null)
  }

  async function confirmDelete() {
    if (!deleteId) return
    const { error } = await deleteCard(deleteId)
    if (error) toast('Error al eliminar', 'error')
    else toast('Tarjeta eliminada', 'success')
    setDeleteId(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    )
  }

  const grouped: Record<string, Card[]> = {}
  for (const card of cards) {
    const type = card.card_type
    if (!grouped[type]) grouped[type] = []
    grouped[type].push(card)
  }

  const orderedTypes = TYPE_ORDER.filter(t => grouped[t]?.length)

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tarjetas y cuentas</h1>
          <p className="text-sm text-muted">{cards.length} registros</p>
        </div>
        <Button onClick={() => setShowForm(true)} size="sm">
          <Plus size={16} /> Agregar
        </Button>
      </div>

      {cards.length === 0 ? (
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
                {grouped[type].map((card) => (
                  <CardItem
                    key={card.id}
                    card={card}
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

      <Modal open={showForm} onClose={handleCloseForm} title="Nueva tarjeta">
        <CardForm onSuccess={() => { handleCloseForm(); refetch() }} />
      </Modal>

      <Modal open={!!editingCard} onClose={handleCloseForm} title="Editar tarjeta">
        {editingCard && (
          <CardForm card={editingCard} onSuccess={() => { handleCloseForm(); refetch() }} />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Eliminar tarjeta"
        message="Esta accion no se puede deshacer. ¿Deseas continuar?"
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
