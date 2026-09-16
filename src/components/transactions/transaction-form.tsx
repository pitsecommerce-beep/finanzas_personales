'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CategoryPicker } from './category-picker'
import { CardSelector } from '@/components/cards/card-selector'
import { useCards } from '@/lib/hooks/use-cards'
import { useTransactions } from '@/lib/hooks/use-transactions'
import { useToast } from '@/components/ui/toast'
import type { TransactionType } from '@/types/database'

interface TransactionFormProps {
  type: TransactionType
  onSuccess?: () => void
}

export function TransactionForm({ type, onSuccess }: TransactionFormProps) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(type === 'expense' ? 'otros' : 'nomina')
  const [cardId, setCardId] = useState<string | null>(null)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [installmentMonths, setInstallmentMonths] = useState('')
  const [loading, setLoading] = useState(false)

  const { cards } = useCards()
  const { addTransaction } = useTransactions()
  const { toast } = useToast()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const numAmount = parseFloat(amount)
    if (!numAmount || numAmount <= 0) {
      toast('Ingresa un monto válido', 'error')
      return
    }

    setLoading(true)
    const result = await addTransaction({
      amount: numAmount,
      description,
      category,
      type,
      card_id: cardId,
      date,
      is_recurring: false,
      installment_months: installmentMonths ? parseInt(installmentMonths) : null,
      installment_current: installmentMonths ? 1 : null,
      notes: null,
    })

    setLoading(false)

    if (result?.error) {
      toast('Error al guardar', 'error')
      return
    }

    toast(type === 'expense' ? 'Gasto registrado' : 'Ingreso registrado', 'success')
    setAmount('')
    setDescription('')
    setCategory(type === 'expense' ? 'otros' : 'nomina')
    setCardId(null)
    setInstallmentMonths('')
    onSuccess?.()
  }

  const selectedCard = cards.find((c) => c.id === cardId)
  const showInstallments = type === 'expense' && selectedCard?.card_type === 'credit'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Monto</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-lg">$</span>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
            className="w-full rounded-lg border border-border bg-white pl-8 pr-3 py-3 text-2xl font-semibold text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>
      </div>

      <Input
        id="description"
        label="Descripción"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={type === 'expense' ? '¿En qué gastaste?' : '¿De dónde proviene?'}
        required
      />

      <CategoryPicker type={type} value={category} onChange={setCategory} />

      {type === 'expense' && (
        <CardSelector cards={cards} value={cardId} onChange={setCardId} />
      )}

      <Input
        id="date"
        label="Fecha"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      {showInstallments && (
        <Input
          id="installments"
          label="Meses sin intereses (MSI)"
          type="number"
          value={installmentMonths}
          onChange={(e) => setInstallmentMonths(e.target.value)}
          placeholder="Dejar vacío si es de contado"
          min="2"
          max="48"
        />
      )}

      <Button type="submit" loading={loading} className="w-full" size="lg">
        {type === 'expense' ? 'Registrar gasto' : 'Registrar ingreso'}
      </Button>
    </form>
  )
}
