'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useCards } from '@/lib/hooks/use-cards'
import { CardItem } from '@/components/cards/card-item'
import { CardForm } from '@/components/cards/card-form'
import { Modal } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'

export default function TarjetasPage() {
  const { cards, loading, deleteCard, refetch } = useCards()
  const [showForm, setShowForm] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { toast } = useToast()

  async function handleDelete(id: string) {
    setDeleteId(id)
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tarjetas</h1>
          <p className="text-sm text-muted">{cards.length} tarjetas registradas</p>
        </div>
        <Button onClick={() => setShowForm(true)} size="sm">
          <Plus size={16} /> Agregar
        </Button>
      </div>

      {cards.length === 0 ? (
        <div className="text-center py-16 text-muted">
          <p className="text-4xl mb-3">💳</p>
          <p className="text-sm mb-4">Agrega tu primera tarjeta</p>
          <Button onClick={() => setShowForm(true)}>Agregar tarjeta</Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {cards.map((card) => (
            <CardItem key={card.id} card={card} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nueva tarjeta">
        <CardForm onSuccess={() => { setShowForm(false); refetch() }} />
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
