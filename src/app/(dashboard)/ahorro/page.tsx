'use client'

import { useState } from 'react'
import { Plus, Trash2, PiggyBank } from 'lucide-react'
import { useSavings } from '@/lib/hooks/use-savings'
import { useCards } from '@/lib/hooks/use-cards'
import { Modal } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CurrencyInput } from '@/components/ui/currency-input'
import { CardSelector } from '@/components/cards/card-selector'
import { useToast } from '@/components/ui/toast'
import { formatMXN } from '@/lib/utils/currency'

export default function AhorroPage() {
  const { goals, loading, addGoal, deleteGoal, refetch } = useSavings()
  const { cards } = useCards()
  const [showForm, setShowForm] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { toast } = useToast()

  const [description, setDescription] = useState('')
  const [monthlyAmount, setMonthlyAmount] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [cardId, setCardId] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const result = await addGoal({
      description,
      monthly_amount: parseFloat(monthlyAmount),
      target_amount: targetAmount ? parseFloat(targetAmount) : null,
      card_id: cardId,
      is_active: true,
    })

    if (result?.error) {
      toast('Error al guardar', 'error')
      return
    }

    toast('Meta de ahorro creada', 'success')
    setDescription('')
    setMonthlyAmount('')
    setTargetAmount('')
    setCardId(null)
    setShowForm(false)
    refetch()
  }

  async function confirmDelete() {
    if (!deleteId) return
    await deleteGoal(deleteId)
    toast('Meta eliminada', 'success')
    setDeleteId(null)
  }

  const totalMonthly = goals.filter(g => g.is_active).reduce((sum, g) => sum + Number(g.monthly_amount), 0)

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
          <h1 className="text-2xl font-bold">Ahorro</h1>
          <p className="text-sm text-muted">Configura metas de ahorro mensual</p>
        </div>
        <Button onClick={() => setShowForm(true)} size="sm">
          <Plus size={16} /> Nueva meta
        </Button>
      </div>

      {totalMonthly > 0 && (
        <div className="bg-accent/10 border border-accent/20 rounded-xl p-4">
          <p className="text-xs text-muted mb-1">Ahorro mensual comprometido</p>
          <p className="text-2xl font-bold text-accent">{formatMXN(totalMonthly)}</p>
        </div>
      )}

      {goals.length === 0 ? (
        <div className="text-center py-16 text-muted">
          <PiggyBank size={48} className="mx-auto mb-3 text-accent/40" />
          <p className="text-sm mb-4">Configura cuanto ahorraras cada mes y hacia donde va ese dinero</p>
          <Button onClick={() => setShowForm(true)}>Crear meta</Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {goals.map((g) => (
            <div key={g.id} className="bg-white rounded-xl border border-border p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold">{g.description}</p>
                  <p className="text-xs text-muted">
                    {g.card?.alias ? `Destino: ${g.card.alias}` : 'Sin cuenta asignada'}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${g.is_active ? 'bg-success/10 text-success' : 'bg-gray-100 text-muted'}`}>
                    {g.is_active ? 'Activa' : 'Pausada'}
                  </span>
                  <button onClick={() => setDeleteId(g.id)} className="text-muted hover:text-danger p-1">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="flex gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted">Mensual</p>
                  <p className="font-semibold text-accent">{formatMXN(g.monthly_amount)}</p>
                </div>
                {g.target_amount && (
                  <div>
                    <p className="text-xs text-muted">Meta</p>
                    <p className="font-semibold">{formatMXN(g.target_amount)}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
        El dinero asignado a metas de ahorro permanece en tu cuenta pero se considera no disponible para gastos. Si un gasto consume ese dinero, recibiras una alerta.
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nueva meta de ahorro">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="description"
            label="Motivo del ahorro"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej: Fondo de emergencia, Viaje, Auto"
            required
          />
          <CurrencyInput
            id="monthlyAmount"
            label="Monto mensual"
            value={monthlyAmount}
            onChange={setMonthlyAmount}
            placeholder="5,000"
            required
          />
          <CurrencyInput
            id="targetAmount"
            label="Meta total (opcional)"
            value={targetAmount}
            onChange={setTargetAmount}
            placeholder="60,000"
          />
          <CardSelector
            cards={cards}
            value={cardId}
            onChange={setCardId}
            label="Cuenta destino"
            filterTypes={['debit', 'savings']}
          />
          <Button type="submit" className="w-full" size="lg">Crear meta</Button>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Eliminar meta"
        message="Esta acción no se puede deshacer. ¿Deseas continuar?"
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
