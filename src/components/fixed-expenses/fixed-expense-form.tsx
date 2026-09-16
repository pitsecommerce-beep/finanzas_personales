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
  const [isMsi, setIsMsi] = useState(true)
  const [description, setDescription] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [totalMonths, setTotalMonths] = useState('')
  const [monthlyAmount, setMonthlyAmount] = useState('')
  const [cardId, setCardId] = useState<string | null>(null)
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState('')
  const [category, setCategory] = useState('otros')
  const [loading, setLoading] = useState(false)

  const { cards } = useCards()
  const { addExpense } = useFixedExpenses()
  const { toast } = useToast()

  const msiMonthly = totalAmount && totalMonths
    ? parseFloat(totalAmount) / parseInt(totalMonths)
    : 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    let data: Record<string, unknown>

    if (isMsi) {
      const total = parseFloat(totalAmount)
      const months = parseInt(totalMonths)
      data = {
        description,
        total_amount: total,
        monthly_amount: Math.round((total / months) * 100) / 100,
        total_months: months,
        card_id: cardId,
        start_date: startDate,
        end_date: null,
        is_msi: true,
        category,
        status: 'active',
      }
    } else {
      const monthly = parseFloat(monthlyAmount)
      data = {
        description,
        total_amount: monthly,
        monthly_amount: monthly,
        total_months: 1,
        card_id: cardId,
        start_date: startDate,
        end_date: endDate || null,
        is_msi: false,
        category,
        status: 'active',
      }
    }

    const result = await addExpense(data)
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
      <div className="space-y-1">
        <label className="block text-sm font-medium text-foreground">Tipo de gasto fijo</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsMsi(true)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
              isMsi ? 'border-accent bg-accent/10 text-accent' : 'border-border text-muted hover:border-gray-300'
            }`}
          >
            MSI (Meses sin intereses)
          </button>
          <button
            type="button"
            onClick={() => setIsMsi(false)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
              !isMsi ? 'border-accent bg-accent/10 text-accent' : 'border-border text-muted hover:border-gray-300'
            }`}
          >
            Gasto mensual
          </button>
        </div>
      </div>

      <Input
        id="description"
        label="Descripción"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={isMsi ? 'Ej: Laptop, Refrigerador' : 'Ej: Renta, Spotify, Gym'}
        required
      />

      {isMsi ? (
        <>
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

          {msiMonthly > 0 && (
            <div className="bg-accent/10 text-accent rounded-lg px-3 py-2 text-sm font-medium">
              Mensualidad: {formatMXN(msiMonthly)}
            </div>
          )}
        </>
      ) : (
        <>
          <Input
            id="monthlyAmount"
            label="Monto mensual"
            type="number"
            step="0.01"
            value={monthlyAmount}
            onChange={(e) => setMonthlyAmount(e.target.value)}
            placeholder="500"
            required
          />
        </>
      )}

      <CardSelector cards={cards} value={cardId} onChange={setCardId} />

      <div className="grid grid-cols-2 gap-3">
        <Input
          id="startDate"
          label="Fecha de inicio"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        {!isMsi && (
          <Input
            id="endDate"
            label="Fecha de fin (opcional)"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        )}
      </div>

      <CategoryPicker type="expense" value={category} onChange={setCategory} />

      <Button type="submit" loading={loading} className="w-full" size="lg">
        Registrar gasto fijo
      </Button>
    </form>
  )
}
