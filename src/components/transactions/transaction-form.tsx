'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CategoryPicker } from './category-picker'
import { CardSelector } from '@/components/cards/card-selector'
import { useCards } from '@/lib/hooks/use-cards'
import { useTransactions } from '@/lib/hooks/use-transactions'
import { CurrencyInput } from '@/components/ui/currency-input'
import { useExchangeRate } from '@/lib/hooks/use-exchange-rate'
import { useToast } from '@/components/ui/toast'
import { formatMXN } from '@/lib/utils/currency'
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
  const [currency, setCurrency] = useState<'MXN' | 'USD'>('MXN')
  const [loading, setLoading] = useState(false)

  const { cards } = useCards()
  const { addTransaction } = useTransactions()
  const { rate: exchangeRate } = useExchangeRate()
  const { toast } = useToast()

  const mxnEquivalent = currency === 'USD' && exchangeRate && amount
    ? parseFloat(amount) * exchangeRate
    : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const numAmount = parseFloat(amount)
    if (!numAmount || numAmount <= 0) {
      toast('Ingresa un monto válido', 'error')
      return
    }

    setLoading(true)
    const finalAmount = currency === 'USD' && exchangeRate ? numAmount * exchangeRate : numAmount
    const result = await addTransaction({
      amount: finalAmount,
      description,
      category,
      type,
      card_id: cardId,
      date,
      is_recurring: false,
      installment_months: installmentMonths ? parseInt(installmentMonths) : null,
      installment_current: installmentMonths ? 1 : null,
      notes: null,
      is_transfer: false,
      transfer_from_card_id: null,
      transfer_to_card_id: null,
      currency,
      exchange_rate: currency === 'USD' ? exchangeRate : null,
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
    setCurrency('MXN')
    onSuccess?.()
  }

  const selectedCard = cards.find((c) => c.id === cardId)
  const showInstallments = type === 'expense' && selectedCard?.card_type === 'credit'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <CurrencyInput
              id="amount"
              label="Monto"
              value={amount}
              onChange={setAmount}
              placeholder="0.00"
              required
              large
            />
          </div>
          <div className="flex gap-1 mb-0.5">
            <button
              type="button"
              onClick={() => setCurrency('MXN')}
              className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                currency === 'MXN' ? 'border-accent bg-accent/10 text-accent' : 'border-border text-muted'
              }`}
            >
              MXN
            </button>
            <button
              type="button"
              onClick={() => setCurrency('USD')}
              className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                currency === 'USD' ? 'border-accent bg-accent/10 text-accent' : 'border-border text-muted'
              }`}
            >
              USD
            </button>
          </div>
        </div>
        {mxnEquivalent != null && (
          <p className="text-xs text-muted">
            Equivale a {formatMXN(mxnEquivalent)} MXN (TC: ${exchangeRate?.toFixed(2)})
          </p>
        )}
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

      <CardSelector cards={cards} value={cardId} onChange={setCardId} />

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
