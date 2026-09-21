'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CurrencyInput } from '@/components/ui/currency-input'
import { CardSelector } from '@/components/cards/card-selector'
import { useAccounts } from '@/lib/data/accounts'
import { useRecurringRules } from '@/lib/data/recurring'
import { useToast } from '@/components/ui/toast'
import type { FrequencyType, RecurringRule } from '@/types/database'

interface IncomeFormProps {
  source?: RecurringRule
  onSuccess?: () => void
}

export function IncomeForm({ source, onSuccess }: IncomeFormProps) {
  const [description, setDescription] = useState(source?.description ?? '')
  const [amount, setAmount] = useState(source?.amount?.toString() ?? '')
  const [frequency, setFrequency] = useState<FrequencyType>(source?.frequency ?? 'monthly')
  const [accountId, setAccountId] = useState<string | null>(source?.account_id ?? null)
  const [nextDate, setNextDate] = useState(source?.next_occurrence ?? '')
  const [loading, setLoading] = useState(false)

  const { accounts } = useAccounts()
  const { addRule, updateRule } = useRecurringRules()
  const { toast } = useToast()

  const isEditing = !!source

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const data: Record<string, unknown> = {
      description,
      amount: parseFloat(amount),
      frequency,
      entry_type: 'income',
      account_id: accountId,
      next_occurrence: nextDate || null,
    }

    let result
    if (isEditing) {
      result = await updateRule(source.id, data)
    } else {
      result = await addRule(data)
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
        label="Descripcion"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Ej: Nomina, Freelance"
        required
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
        cards={accounts}
        value={accountId}
        onChange={setAccountId}
        label="Cuenta destino"
        filterTypes={['debit', 'savings', 'cash', 'voucher']}
      />

      <Input
        id="nextDate"
        label="Proximo pago"
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
