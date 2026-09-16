'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { BANKS } from '@/lib/constants/banks'
import { CARD_COLORS } from '@/lib/constants/colors'
import { useCards } from '@/lib/hooks/use-cards'
import { useToast } from '@/components/ui/toast'
import type { Card, CardType } from '@/types/database'

interface CardFormProps {
  card?: Card
  onSuccess?: () => void
}

export function CardForm({ card, onSuccess }: CardFormProps) {
  const [bankName, setBankName] = useState(card?.bank_name ?? '')
  const [alias, setAlias] = useState(card?.alias ?? '')
  const [cardType, setCardType] = useState<CardType>(card?.card_type ?? 'credit')
  const [lastFour, setLastFour] = useState(card?.last_four_digits ?? '')
  const [cutOffDay, setCutOffDay] = useState(card?.cut_off_day?.toString() ?? '')
  const [paymentDay, setPaymentDay] = useState(card?.payment_day?.toString() ?? '')
  const [creditLimit, setCreditLimit] = useState(card?.credit_limit?.toString() ?? '')
  const [color, setColor] = useState(card?.color ?? '#14B8A6')
  const [loading, setLoading] = useState(false)

  const { addCard, updateCard } = useCards()
  const { toast } = useToast()

  const isEditing = !!card

  useEffect(() => {
    if (card) {
      setBankName(card.bank_name)
      setAlias(card.alias)
      setCardType(card.card_type)
      setLastFour(card.last_four_digits ?? '')
      setCutOffDay(card.cut_off_day?.toString() ?? '')
      setPaymentDay(card.payment_day?.toString() ?? '')
      setCreditLimit(card.credit_limit?.toString() ?? '')
      setColor(card.color)
    }
  }, [card])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const cardData = {
      bank_name: bankName,
      alias,
      card_type: cardType,
      last_four_digits: lastFour || null,
      cut_off_day: parseInt(cutOffDay),
      payment_day: parseInt(paymentDay),
      credit_limit: creditLimit ? parseFloat(creditLimit) : null,
      color,
    }

    let result
    if (isEditing) {
      result = await updateCard(card.id, cardData)
    } else {
      result = await addCard(cardData)
    }

    setLoading(false)

    if (result?.error) {
      toast(`Error al ${isEditing ? 'actualizar' : 'guardar'} la tarjeta`, 'error')
      return
    }

    toast(isEditing ? 'Tarjeta actualizada' : 'Tarjeta agregada', 'success')
    onSuccess?.()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select
        id="bank"
        label="Banco"
        value={bankName}
        onChange={(e) => setBankName(e.target.value)}
        options={BANKS.map((b) => ({ value: b, label: b }))}
        placeholder="Selecciona un banco"
        required
      />

      <Input
        id="alias"
        label="Alias"
        value={alias}
        onChange={(e) => setAlias(e.target.value)}
        placeholder="Ej: Mi Oro BBVA"
        required
      />

      <div className="space-y-1">
        <label className="block text-sm font-medium text-foreground">Tipo de tarjeta<span className="ml-0.5">*</span></label>
        <div className="flex gap-2">
          {(['credit', 'debit'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setCardType(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                cardType === t
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-muted hover:border-gray-300'
              }`}
            >
              {t === 'credit' ? 'Credito' : 'Debito'}
            </button>
          ))}
        </div>
      </div>

      <Input
        id="lastFour"
        label="Ultimos 4 digitos"
        value={lastFour}
        onChange={(e) => setLastFour(e.target.value.replace(/\D/g, '').slice(0, 4))}
        placeholder="1234"
        maxLength={4}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          id="cutOff"
          label="Dia de corte"
          type="number"
          min="1"
          max="31"
          value={cutOffDay}
          onChange={(e) => setCutOffDay(e.target.value)}
          placeholder="15"
          required
        />
        <Input
          id="paymentDay"
          label="Dia de pago"
          type="number"
          min="1"
          max="31"
          value={paymentDay}
          onChange={(e) => setPaymentDay(e.target.value)}
          placeholder="5"
          required
        />
      </div>

      {cardType === 'credit' && (
        <Input
          id="creditLimit"
          label="Limite de credito"
          type="number"
          value={creditLimit}
          onChange={(e) => setCreditLimit(e.target.value)}
          placeholder="50000"
        />
      )}

      <div className="space-y-1">
        <label className="block text-sm font-medium text-foreground">Color</label>
        <div className="flex gap-2 flex-wrap">
          {CARD_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setColor(c.value)}
              className={`w-8 h-8 rounded-full border-2 transition-transform ${
                color === c.value ? 'border-accent scale-110' : 'border-transparent'
              }`}
              style={{ backgroundColor: c.value }}
              title={c.label}
            />
          ))}
        </div>
      </div>

      <Button type="submit" loading={loading} className="w-full" size="lg">
        {isEditing ? 'Guardar cambios' : 'Agregar tarjeta'}
      </Button>
    </form>
  )
}
