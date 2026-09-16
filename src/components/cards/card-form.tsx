'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Select } from '@/components/ui/select'
import { BANKS, VOUCHER_BRANDS } from '@/lib/constants/banks'
import { CARD_COLORS } from '@/lib/constants/colors'
import { useCards } from '@/lib/hooks/use-cards'
import { useToast } from '@/components/ui/toast'
import type { Card, CardType, YieldFrequency } from '@/types/database'

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
  const [yieldRate, setYieldRate] = useState(card?.yield_rate?.toString() ?? '')
  const [yieldRateAbove, setYieldRateAbove] = useState(card?.yield_rate_above_limit?.toString() ?? '')
  const [yieldFrequency, setYieldFrequency] = useState<YieldFrequency>(card?.yield_frequency ?? 'daily')
  const [moneyAvailability, setMoneyAvailability] = useState(card?.money_availability ?? 'immediate')
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
      setYieldRate(card.yield_rate?.toString() ?? '')
      setYieldRateAbove(card.yield_rate_above_limit?.toString() ?? '')
      setYieldFrequency(card.yield_frequency ?? 'daily')
      setMoneyAvailability(card.money_availability ?? 'immediate')
      setColor(card.color)
    }
  }, [card])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const today = new Date().toISOString().split('T')[0]
    const isSavings = cardType === 'savings'
    const hasBalance = cardType === 'debit' || cardType === 'cash' || isSavings || cardType === 'voucher'

    const cardData: Record<string, unknown> = {
      bank_name: cardType === 'cash' ? 'Efectivo' : bankName,
      alias: cardType === 'cash' && !alias ? 'Dinero en efectivo' : alias,
      card_type: cardType,
      last_four_digits: (cardType === 'cash' || cardType === 'voucher') ? null : (lastFour || null),
      cut_off_day: cardType === 'credit' ? parseInt(cutOffDay) : null,
      payment_day: cardType === 'credit' ? parseInt(paymentDay) : null,
      credit_limit: cardType === 'credit' && creditLimit ? parseFloat(creditLimit) : null,
      balance: hasBalance && balance ? parseFloat(balance) : null,
      color,
    }

    if (isSavings) {
      cardData.has_yields = true
      cardData.yield_rate = yieldRate ? parseFloat(yieldRate) : null
      cardData.last_yield_date = card?.last_yield_date ?? today
      cardData.yield_frequency = yieldFrequency
      cardData.money_availability = moneyAvailability
      const bal = balance ? parseFloat(balance) : 0
      if (bal > 25000 && yieldRateAbove) {
        cardData.yield_rate_above_limit = parseFloat(yieldRateAbove)
      } else {
        cardData.yield_rate_above_limit = null
      }
    } else {
      cardData.has_yields = false
      cardData.yield_rate = null
      cardData.last_yield_date = null
      cardData.yield_frequency = null
      cardData.money_availability = null
      cardData.yield_rate_above_limit = null
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
    { value: 'savings', label: 'Ahorro' },
    { value: 'cash', label: 'Efectivo' },
    { value: 'voucher', label: 'Vales' },
  ]

  const showBank = cardType !== 'cash' && cardType !== 'voucher'
  const showDigits = cardType !== 'cash' && cardType !== 'voucher'
  const showBalance = cardType === 'debit' || cardType === 'cash' || cardType === 'savings' || cardType === 'voucher'
  const balanceNum = balance ? parseFloat(balance) : 0

  const yieldFreqOptions = [
    { value: 'daily', label: 'Diario' },
    { value: 'monthly', label: 'Mensual' },
    { value: 'quarterly', label: 'Trimestral' },
    { value: 'annual', label: 'Anual' },
  ]

  const availabilityOptions = [
    { value: 'immediate', label: 'Inmediata' },
    { value: '24h', label: '24 horas' },
    { value: '48h', label: '48 horas' },
    { value: '28_days', label: '28 días' },
    { value: 'custom', label: 'Otra' },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="block text-sm font-medium text-foreground">Tipo<span className="ml-0.5">*</span></label>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
          {typeOptions.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setCardType(t.value)}
              className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
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

      {showBank && (
        <Select
          id="bank"
          label="Banco / Institución"
          value={bankName}
          onChange={(e) => setBankName(e.target.value)}
          options={BANKS.map((b) => ({ value: b, label: b }))}
          placeholder="Selecciona"
          required
        />
      )}

      {cardType === 'voucher' && (
        <Select
          id="voucherBrand"
          label="Marca de vales"
          value={bankName}
          onChange={(e) => setBankName(e.target.value)}
          options={VOUCHER_BRANDS.map((b) => ({ value: b, label: b }))}
          placeholder="Selecciona"
          required
        />
      )}

      <Input
        id="alias"
        label="Alias"
        value={alias}
        onChange={(e) => setAlias(e.target.value)}
        placeholder={
          cardType === 'cash' ? 'Ej: Mi cartera' :
          cardType === 'voucher' ? 'Ej: Vales trabajo' :
          cardType === 'savings' ? 'Ej: Cuenta Nu ahorro' :
          'Ej: Mi Oro BBVA'
        }
        required={cardType !== 'cash'}
      />

      {showDigits && (
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
          <CurrencyInput
            id="creditLimit"
            label="Limite de credito"
            value={creditLimit}
            onChange={setCreditLimit}
            placeholder="50,000"
          />
        </>
      )}

      {showBalance && (
        <CurrencyInput
          id="balance"
          label="Saldo actual"
          value={balance}
          onChange={setBalance}
          placeholder="0.00"
        />
      )}

      {cardType === 'savings' && (
        <>
          <Input
            id="yieldRate"
            label="Tasa anual (%) hasta $25,000"
            type="number"
            step="0.001"
            min="0"
            max="100"
            value={yieldRate}
            onChange={(e) => setYieldRate(e.target.value)}
            placeholder="Ej: 15.0"
            required
          />

          {balanceNum > 25000 && (
            <Input
              id="yieldRateAbove"
              label="Tasa anual (%) arriba de $25,000"
              type="number"
              step="0.001"
              min="0"
              max="100"
              value={yieldRateAbove}
              onChange={(e) => setYieldRateAbove(e.target.value)}
              placeholder="Ej: 4.0"
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <Select
              id="yieldFreq"
              label="Frecuencia de rendimiento"
              value={yieldFrequency}
              onChange={(e) => setYieldFrequency(e.target.value as YieldFrequency)}
              options={yieldFreqOptions}
            />
            <Select
              id="availability"
              label="Disponibilidad del dinero"
              value={moneyAvailability}
              onChange={(e) => setMoneyAvailability(e.target.value)}
              options={availabilityOptions}
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700">
            Regulación mexicana: los rendimientos garantizados aplican hasta $25,000 MXN. El excedente genera una tasa menor.
          </div>
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
              } ${c.value === '#F8FAFC' ? 'ring-1 ring-gray-200' : ''}`}
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
