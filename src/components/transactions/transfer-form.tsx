'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CurrencyInput } from '@/components/ui/currency-input'
import { useCards } from '@/lib/hooks/use-cards'
import { useTransactions } from '@/lib/hooks/use-transactions'
import { useToast } from '@/components/ui/toast'
import type { Card } from '@/types/database'

interface TransferFormProps {
  onSuccess?: () => void
}

function cardLabel(card: Card): string {
  if (card.card_type === 'cash') return card.alias
  if (card.card_type === 'voucher') return `${card.alias} (${card.bank_name})`
  const digits = card.last_four_digits ? ` ****${card.last_four_digits}` : ''
  return `${card.alias} (${card.bank_name}${digits})`
}

const TYPE_LABELS: Record<string, string> = {
  credit: 'Crédito',
  debit: 'Débito',
  cash: 'Efectivo',
  savings: 'Ahorro',
  voucher: 'Vales',
}

export function TransferForm({ onSuccess }: TransferFormProps) {
  const [fromCardId, setFromCardId] = useState<string>('')
  const [toCardId, setToCardId] = useState<string>('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
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
    if (!fromCardId || !toCardId) {
      toast('Selecciona cuenta de origen y destino', 'error')
      return
    }
    if (fromCardId === toCardId) {
      toast('Origen y destino deben ser diferentes', 'error')
      return
    }

    setLoading(true)

    const toCard = cards.find(c => c.id === toCardId)
    const isCreditPayment = toCard?.card_type === 'credit'

    const result = await addTransaction({
      amount: numAmount,
      description: description || (isCreditPayment ? 'Pago a tarjeta de crédito' : 'Traspaso entre cuentas'),
      category: isCreditPayment ? 'pago_credito' : 'traspaso',
      type: 'expense',
      card_id: fromCardId,
      date,
      is_recurring: false,
      installment_months: null,
      installment_current: null,
      notes: null,
      is_transfer: true,
      transfer_from_card_id: fromCardId,
      transfer_to_card_id: toCardId,
      currency: 'MXN',
      exchange_rate: null,
    })

    setLoading(false)

    if (result?.error) {
      toast('Error al registrar traspaso', 'error')
      return
    }

    toast(isCreditPayment ? 'Pago registrado' : 'Traspaso registrado', 'success')
    onSuccess?.()
  }

  const grouped: Record<string, Card[]> = {}
  for (const card of cards) {
    const type = TYPE_LABELS[card.card_type] ?? card.card_type
    if (!grouped[type]) grouped[type] = []
    grouped[type].push(card)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <CurrencyInput
        id="amount"
        label="Monto"
        value={amount}
        onChange={setAmount}
        placeholder="0.00"
        required
        large
      />

      <Input
        id="description"
        label="Descripción (opcional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Ej: Pago mensual tarjeta"
      />

      <div className="space-y-1">
        <label className="block text-sm font-medium text-foreground">Cuenta de origen</label>
        <select
          value={fromCardId}
          onChange={(e) => setFromCardId(e.target.value)}
          required
          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        >
          <option value="">Seleccionar</option>
          {Object.entries(grouped).map(([type, items]) => (
            <optgroup key={type} label={type}>
              {items.map((card) => (
                <option key={card.id} value={card.id}>{cardLabel(card)}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-foreground">Cuenta destino</label>
        <select
          value={toCardId}
          onChange={(e) => setToCardId(e.target.value)}
          required
          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        >
          <option value="">Seleccionar</option>
          {Object.entries(grouped).map(([type, items]) => (
            <optgroup key={type} label={type}>
              {items.map((card) => (
                <option key={card.id} value={card.id}>{cardLabel(card)}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {cards.find(c => c.id === toCardId)?.card_type === 'credit' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700">
          Este traspaso se registra como pago a la deuda de la tarjeta de crédito.
        </div>
      )}

      <Input
        id="date"
        label="Fecha"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      <Button type="submit" loading={loading} className="w-full" size="lg">
        Registrar traspaso
      </Button>
    </form>
  )
}
