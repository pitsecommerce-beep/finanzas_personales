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
  const [balance, setBalance] = useState(card?.balance?.toString() ?? '')
  const [hasYields, setHasYields] = useState(card?.has_yields ?? false)
  const [yieldRate, setYieldRate] = useState(card?.yield_rate?.toString() ?? '')
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
      setBalance(card.balance?.toString() ?? '')
      setHasYields(card.has_yields)
      setYieldRate(card.yield_rate?.toString() ?? '')
      setColor(card.color)
    }
  }, [card])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const yieldsEnabled = cardType === 'debit' && hasYields
    const today = new Date().toISOString().split('T')[0]

    const cardData = {
      bank_name: cardType === 'cash' ? 'Efectivo' : bankName,
      alias: cardType === 'cash' && !alias ? 'Dinero en efectivo' : alias,
      card_type: cardType,
      last_four_digits: cardType === 'cash' ? null : (lastFour || null),
      cut_off_day: cardType === 'credit' ? parseInt(cutOffDay) : null,
      payment_day: cardType === 'credit' ? parseInt(paymentDay) : null,
      credit_limit: cardType === 'credit' && creditLimit ? parseFloat(creditLimit) : null,
      balance: (cardType === 'debit' || cardType === 'cash') && balance ? parseFloat(balance) : null,
      color,
      has_yields: yieldsEnabled,
      yield_rate: yieldsEnabled && yieldRate ? parseFloat(yieldRate) : null,
      last_yield_date: yieldsEnabled ? (card?.last_yield_date ?? today) : null,
    }

    let result
    if (isEditing) {
      result = await updateCard(card.id, cardData)
    } else {
      result = await addCard(cardData)
    }

    setLoading(false)

    if (result?.error) {
      toast(`Error al ${isEditing ? 'actualizar' : 'guardar'}`, 'error')
      return
    }

    toast(isEditing ? 'Actualizado' : 'Agregado', 'success')
    onSuccess?.()
  }

  const typeOptions: { value: CardType; label: string }[] = [
    { value: 'credit', label: 'Crédito' },
    { value: 'debit', label: 'Débito' },
    { value: 'cash', label: 'Efectivo' },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="block text-sm font-medium text-foreground">Tipo<span className="ml-0.5">*</span></label>
        <div className="flex gap-2">
          {typeOptions.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setCardType(t.value)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                cardType === t.value
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-muted hover:border-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {cardType !== 'cash' && (
        <Select
          id="bank"
          label="Banco"
          value={bankName}
          onChange={(e) => setBankName(e.target.value)}
          options={BANKS.map((b) => ({ value: b, label: b }))}
          placeholder="Selecciona un banco"
          required
        />
      )}

      <Input
        id="alias"
        label="Alias"
        value={alias}
        onChange={(e) => setAlias(e.target.value)}
        placeholder={cardType === 'cash' ? 'Ej: Mi cartera' : 'Ej: Mi Oro BBVA'}
        required={cardType !== 'cash'}
      />

      {cardType !== 'cash' && (
        <Input
          id="lastFour"
          label="Últimos 4 dígitos"
          value={lastFour}
          onChange={(e) => setLastFour(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder="1234"
          maxLength={4}
        />
      )}

      {cardType === 'credit' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="cutOff"
              label="Día de corte"
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
              label="Día de pago"
              type="number"
              min="1"
              max="31"
              value={paymentDay}
              onChange={(e) => setPaymentDay(e.target.value)}
              placeholder="5"
              required
            />
          </div>
          <Input
            id="creditLimit"
            label="Límite de crédito"
            type="number"
            value={creditLimit}
            onChange={(e) => setCreditLimit(e.target.value)}
            placeholder="50000"
          />
        </>
      )}

      {(cardType === 'debit' || cardType === 'cash') && (
        <Input
          id="balance"
          label="Saldo actual"
          type="number"
          step="0.01"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          placeholder="0.00"
        />
      )}

      {cardType === 'debit' && (
        <>
          <div className="flex items-center gap-3">
            <label htmlFor="hasYields" className="text-sm font-medium text-foreground">
              ¿Genera rendimientos?
            </label>
            <button
              type="button"
              role="switch"
              aria-checked={hasYields}
              onClick={() => setHasYields(!hasYields)}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                hasYields ? 'bg-accent' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  hasYields ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>
          {hasYields && (
            <Input
              id="yieldRate"
              label="Tasa anual (%)"
              type="number"
              step="0.001"
              min="0"
              max="100"
              value={yieldRate}
              onChange={(e) => setYieldRate(e.target.value)}
              placeholder="Ej: 15.5"
              required
            />
          )}
        </>
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
        {isEditing ? 'Guardar cambios' : 'Agregar'}
      </Button>
    </form>
  )
}
