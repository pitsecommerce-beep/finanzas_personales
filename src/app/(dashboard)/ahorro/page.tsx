'use client'

import { useState } from 'react'
import { Plus, Trash2, Pencil, PiggyBank } from 'lucide-react'
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
import { todayMX } from '@/lib/utils/dates'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { SavingsGoal } from '@/types/database'

export default function AhorroPage() {
  const { goals, loading, addGoal, updateGoal, deleteGoal, refetch } = useSavings()
  const { cards } = useCards()
  const [showForm, setShowForm] = useState(false)
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { toast } = useToast()

  const [description, setDescription] = useState('')
  const [monthlyAmount, setMonthlyAmount] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [sourceCardId, setSourceCardId] = useState<string | null>(null)
  const [cardId, setCardId] = useState<string | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  function openCreate() {
    setDescription('')
    setMonthlyAmount('')
    setTargetAmount('')
    setSourceCardId(null)
    setCardId(null)
    setStartDate(todayMX())
    setEndDate('')
    setShowForm(true)
  }

  function openEdit(goal: SavingsGoal) {
    setDescription(goal.description)
    setMonthlyAmount(goal.monthly_amount.toString())
    setTargetAmount(goal.target_amount?.toString() ?? '')
    setSourceCardId(goal.source_card_id)
    setCardId(goal.card_id)
    setStartDate(goal.start_date ?? '')
    setEndDate(goal.end_date ?? '')
    setEditingGoal(goal)
  }

  function closeForm() {
    setShowForm(false)
    setEditingGoal(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const data = {
      description,
      monthly_amount: parseFloat(monthlyAmount),
      target_amount: targetAmount ? parseFloat(targetAmount) : null,
      source_card_id: sourceCardId,
      card_id: cardId,
      start_date: startDate || null,
      end_date: endDate || null,
      is_active: true,
    }

    let result
    if (editingGoal) {
      result = await updateGoal(editingGoal.id, data)
    } else {
      result = await addGoal(data)
    }

    if (result?.error) {
      toast('Error al guardar', 'error')
      return
    }

    toast(editingGoal ? 'Meta actualizada' : 'Meta de ahorro creada', 'success')
    closeForm()
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
        <Button onClick={openCreate} size="sm">
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
          <p className="text-sm mb-4">Configura cuánto ahorrarás cada mes y hacia dónde va ese dinero</p>
          <Button onClick={openCreate}>Crear meta</Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {goals.map((g) => (
            <div key={g.id} className="bg-white rounded-xl border border-border p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold">{g.description}</p>
                  <p className="text-xs text-muted">
                    {g.source_card?.alias ? `Origen: ${g.source_card.alias}` : 'Sin cuenta origen'}
                    {g.card?.alias ? ` → Destino: ${g.card.alias}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${g.is_active ? 'bg-success/10 text-success' : 'bg-gray-100 text-muted'}`}>
                    {g.is_active ? 'Activa' : 'Pausada'}
                  </span>
                  <button onClick={() => openEdit(g)} className="text-muted hover:text-accent p-1">
                    <Pencil size={14} />
                  </button>
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
              {(g.start_date || g.end_date) && (
                <p className="text-xs text-muted mt-2">
                  {g.start_date && format(new Date(g.start_date + 'T12:00:00'), "d MMM yyyy", { locale: es })}
                  {g.start_date && g.end_date && ' → '}
                  {g.end_date && format(new Date(g.end_date + 'T12:00:00'), "d MMM yyyy", { locale: es })}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
        El dinero asignado a metas de ahorro permanece en tu cuenta pero se considera no disponible para gastos. Si un gasto consume ese dinero, recibirás una alerta.
      </div>

      <Modal open={showForm || !!editingGoal} onClose={closeForm} title={editingGoal ? 'Editar meta de ahorro' : 'Nueva meta de ahorro'}>
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
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="startDate"
              label="Fecha de inicio"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              id="endDate"
              label="Fecha fin (opcional)"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <CardSelector
            cards={cards}
            value={sourceCardId}
            onChange={setSourceCardId}
            label="Cuenta origen *"
          />
          <CardSelector
            cards={cards.filter(c => c.id !== sourceCardId)}
            value={cardId}
            onChange={setCardId}
            label="Cuenta destino (opcional)"
            filterTypes={['debit', 'savings']}
          />
          {cardId && (
            <div className="bg-accent/10 border border-accent/20 rounded-lg px-3 py-2 text-xs text-accent">
              Se programará un traspaso automático de la cuenta origen a la cuenta destino en las fechas configuradas.
            </div>
          )}
          {!cardId && sourceCardId && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs text-yellow-700">
              El dinero se apartará dentro de la cuenta origen. Si gastas de ese apartado, recibirás una alerta.
            </div>
          )}
          <Button type="submit" className="w-full" size="lg">
            {editingGoal ? 'Guardar cambios' : 'Crear meta'}
          </Button>
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
