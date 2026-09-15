'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useIncome } from '@/lib/hooks/use-income'
import { useToast } from '@/components/ui/toast'
import type { FrequencyType } from '@/types/database'

interface IncomeFormProps {
  onSuccess?: () => void
}

export function IncomeForm({ onSuccess }: IncomeFormProps) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [frequency, setFrequency] = useState<FrequencyType>('monthly')
  const [nextDate, setNextDate] = useState('')
  const [loading, setLoading] = useState(false)

  const { addSource } = useIncome()
  const { toast } = useToast()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const result = await addSource({
      description,
      amount: parseFloat(amount),
      frequency,
      next_payment_date: nextDate || null,
    })

    setLoading(false)

    if (result?.error) {
      toast('Error al guardar', 'error')
      return
    }

    toast('Fuente de ingreso agregada', 'success')
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

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Monto aproximado</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-lg">$</span>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
            className="w-full rounded-lg border border-border bg-white pl-8 pr-3 py-3 text-xl font-semibold text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>
      </div>

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

      <Input
        id="nextDate"
        label="Próximo pago"
        type="date"
        value={nextDate}
        onChange={(e) => setNextDate(e.target.value)}
      />

      <Button type="submit" loading={loading} className="w-full" size="lg">
        Agregar fuente de ingreso
      </Button>
    </form>
  )
}
