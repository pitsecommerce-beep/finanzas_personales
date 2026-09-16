'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Select } from '@/components/ui/select'
import { CardSelector } from '@/components/cards/card-selector'
import { useCards } from '@/lib/hooks/use-cards'
import { useIncome } from '@/lib/hooks/use-income'
import { useToast } from '@/components/ui/toast'
import { INCOME_TYPES } from '@/lib/constants/categories'
import type { FrequencyType, IncomeType } from '@/types/database'

interface IncomeFormProps {
  source?: { id: string; description: string; amount: number; frequency: FrequencyType; income_type?: IncomeType; card_id?: string | null; next_payment_date?: string | null }
  onSuccess?: () => void
}

export function IncomeForm({ source, onSuccess }: IncomeFormProps) {
  const [description, setDescription] = useState(source?.description ?? '')
  const [amount, setAmount] = useState(source?.amount?.toString() ?? '')
  const [frequency, setFrequency] = useState<FrequencyType>(source?.frequency ?? 'monthly')
  const [incomeType, setIncomeType] = useState<IncomeType>((source?.income_type as IncomeType) ?? 'other')
  const [cardId, setCardId] = useState<string | null>(source?.card_id ?? null)
  const [nextDate, setNextDate] = useState(source?.next_payment_date ?? '')
  const [loading, setLoading] = useState(false)

  const { cards } = useCards()
  const { addSource, updateSource } = useIncome()
  const { toast } = useToast()

  const isEditing = !!source

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const data = {
      description,
      amount: parseFloat(amount),
      frequency,
      income_type: incomeType,
      card_id: cardId,
      next_payment_date: nextDate || null,
    }

    let result
    if (isEditing) {
      result = await updateSource(source.id, data)
    } else {
      result = await addSource(data)
    }

    setLoading(false)

    if (result?.error) {
      toast('Error al guardar', 'error')
      return
    }

    toast(isEditing ? 'Fuente actualizada' : 'Fuente de ingreso agregada', 'success')
    onSuccess?.()
  }

  const frequencies: { value: FrequencyType; label: string }[] = [
    { value: 'weekly', label: 'Semanal' },
    { value: 'biweekly', label: 'Quincenal' },
    { value: 'monthly', label: 'Mensual' },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        id="description"
        label="Descripción"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Ej: Nómina, Freelance"
        required
      />

      <Select
        id="incomeType"
        label="Tipo de ingreso"
        value={incomeType}
        onChange={(e) => setIncomeType(e.target.value as IncomeType)}
        options={INCOME_TYPES.map(t => ({ value: t.value, label: t.label }))}
      />

      <CurrencyInput
        id="amount"
        label="Monto aproximado"
        value={amount}
        onChange={setAmount}
        placeholder="0.00"
        required
        large
      />

      <div className="space-y-1">
        <label className="block text-sm font-medium text-foreground">Frecuencia de pago</label>
        <div className="flex gap-2">
          {frequencies.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFrequency(f.value)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                frequency === f.value
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-muted hover:border-gray-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <CardSelector
        cards={cards}
        value={cardId}
        onChange={setCardId}
        label="Cuenta destino"
        filterTypes={['debit', 'savings', 'cash', 'voucher']}
      />

      <Input
        id="nextDate"
        label="Próximo pago"
        type="date"
        value={nextDate}
        onChange={(e) => setNextDate(e.target.value)}
      />

      <Button type="submit" loading={loading} className="w-full" size="lg">
        {isEditing ? 'Guardar cambios' : 'Agregar fuente de ingreso'}
      </Button>
    </form>
  )
}
