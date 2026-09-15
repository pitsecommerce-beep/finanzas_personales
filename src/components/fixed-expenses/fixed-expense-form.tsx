'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CategoryPicker } from '@/components/transactions/category-picker'
import { CardSelector } from '@/components/cards/card-selector'
import { useCards } from '@/lib/hooks/use-cards'
import { useFixedExpenses } from '@/lib/hooks/use-fixed-expenses'
import { useToast } from '@/components/ui/toast'
import { formatMXN } from '@/lib/utils/currency'

interface FixedExpenseFormProps {
  onSuccess?: () => void
}

export function FixedExpenseForm({ onSuccess }: FixedExpenseFormProps) {
  const [description, setDescription] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [totalMonths, setTotalMonths] = useState('')
  const [cardId, setCardId] = useState<string | null>(null)
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [category, setCategory] = useState('otros')
  const [loading, setLoading] = useState(false)

  const { cards } = useCards()
  const { addExpense } = useFixedExpenses()
  const { toast } = useToast()

  const monthly = totalAmount && totalMonths
    ? parseFloat(totalAmount) / parseInt(totalMonths)
    : 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const result = await addExpense({
      description,
      total_amount: parseFloat(totalAmount),
      monthly_amount: Math.round(monthly * 100) / 100,
      total_months: parseInt(totalMonths),
      card_id: cardId,
      start_date: startDate,
      category,
      status: 'active',
    })

    setLoading(false)

    if (result?.error) {
      toast('Error al guardar', 'error')
      return
    }

    toast('Gasto fijo registrado', 'success')
    onSuccess?.()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        id="description"
        label="Descripción"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Ej: Laptop, Refrigerador"
        required
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          id="totalAmount"
          label="Monto total"
          type="number"
          step="0.01"
          value={totalAmount}
          onChange={(e) => setTotalAmount(e.target.value)}
          placeholder="15000"
          required
        />
        <Input
          id="totalMonths"
          label="Meses (MSI)"
          type="number"
          min="2"
          max="48"
          value={totalMonths}
          onChange={(e) => setTotalMonths(e.target.value)}
          placeholder="12"
          required
        />
      </div>

      {monthly > 0 && (
        <div className="bg-accent/10 text-accent rounded-lg px-3 py-2 text-sm font-medium">
          Mensualidad: {formatMXN(monthly)}
        </div>
      )}

      <CardSelector cards={cards} value={cardId} onChange={setCardId} />

      <Input
        id="startDate"
        label="Fecha de inicio"
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
      />

      <CategoryPicker type="expense" value={category} onChange={setCategory} />

      <Button type="submit" loading={loading} className="w-full" size="lg">
        Registrar gasto fijo
      </Button>
    </form>
  )
}
