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
import type { Transaction, TransactionType } from '@/types/database'

interface TransactionFormProps {
  type: TransactionType
  transaction?: Transaction
  onSuccess?: () => void
}

export function TransactionForm({ type, transaction, onSuccess }: TransactionFormProps) {
  const [amount, setAmount] = useState(transaction?.amount?.toString() ?? '')
  const [description, setDescription] = useState(transaction?.description ?? '')
  const [category, setCategory] = useState(transaction?.category ?? (type === 'expense' ? 'otros' : 'nomina'))
  const [cardId, setCardId] = useState<string | null>(transaction?.card_id ?? null)
  const [date, setDate] = useState(transaction?.date ?? new Date().toISOString().split('T')[0])
  const [installmentMonths, setInstallmentMonths] = useState(transaction?.installment_months?.toString() ?? '')
  const [currency, setCurrency] = useState<'MXN' | 'USD'>((transaction?.currency as 'MXN' | 'USD') ?? 'MXN')
  const [loading, setLoading] = useState(false)

  const isEditing = !!transaction

  const { cards } = useCards()
  const { addTransaction, updateTransaction } = useTransactions()
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

    let result
    if (isEditing) {
      result = await updateTransaction(transaction.id, {
        amount: finalAmount,
        description,
        category,
        card_id: cardId,
        date,
        installment_months: installmentMonths ? parseInt(installmentMonths) : null,
        currency,
        exchange_rate: currency === 'USD' ? exchangeRate : null,
      })
    } else {
      result = await addTransaction({
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
    }

    setLoading(false)

    if (result?.error) {
      const msg = result.error.message || 'Error al guardar'
      console.error('[Nummo] Error transaccion:', result.error)
      toast(msg, 'error')
      return
    }

    toast(isEditing
      ? 'Actualizado'
      : (type === 'expense' ? 'Gasto registrado' : 'Ingreso registrado'),
      'success'
    )
    if (!isEditing) {
      setAmount('')
      setDescription('')
      setCategory(type === 'expense' ? 'otros' : 'nomina')
      setCardId(null)
      setInstallmentMonths('')
      setCurrency('MXN')
    }
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
        {isEditing ? 'Guardar cambios' : (type === 'expense' ? 'Registrar gasto' : 'Registrar ingreso')}
      </Button>
    </form>
  )
}
