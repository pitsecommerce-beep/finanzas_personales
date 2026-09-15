'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { BANKS } from '@/lib/constants/banks'
import { CARD_COLORS } from '@/lib/constants/colors'
import { useCards } from '@/lib/hooks/use-cards'
import { useToast } from '@/components/ui/toast'
import type { CardType } from '@/types/database'

interface CardFormProps {
  onSuccess?: () => void
}

export function CardForm({ onSuccess }: CardFormProps) {
  const [bankName, setBankName] = useState('')
  const [alias, setAlias] = useState('')
  const [cardType, setCardType] = useState<CardType>('credit')
  const [lastFour, setLastFour] = useState('')
  const [cutOffDay, setCutOffDay] = useState('')
  const [paymentDay, setPaymentDay] = useState('')
  const [creditLimit, setCreditLimit] = useState('')
  const [color, setColor] = useState('#14B8A6')
  const [loading, setLoading] = useState(false)

  const { addCard } = useCards()
  const { toast } = useToast()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const result = await addCard({
      bank_name: bankName,
      alias,
      card_type: cardType,
      last_four_digits: lastFour || null,
      cut_off_day: parseInt(cutOffDay),
      payment_day: parseInt(paymentDay),
      credit_limit: creditLimit ? parseFloat(creditLimit) : null,
      color,
    })

    setLoading(false)

    if (result?.error) {
      toast('Error al guardar la tarjeta', 'error')
      return
    }

    toast('Tarjeta agregada', 'success')
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
        <label className="block text-sm font-medium text-foreground">Tipo de tarjeta<span className="text-danger ml-0.5">*</span></label>
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
              {t === 'credit' ? 'Crédito' : 'Débito'}
            </button>
          ))}
        </div>
      </div>

      <Input
        id="lastFour"
        label="Últimos 4 dígitos"
        value={lastFour}
        onChange={(e) => setLastFour(e.target.value.replace(/\D/g, '').slice(0, 4))}
        placeholder="1234"
        maxLength={4}
      />

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

      {cardType === 'credit' && (
        <Input
          id="creditLimit"
          label="Límite de crédito"
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
        Agregar tarjeta
      </Button>
    </form>
  )
}
