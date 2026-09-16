'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CategoryPicker } from '@/components/transactions/category-picker'
import { CardSelector } from '@/components/cards/card-selector'
import { useCards } from '@/lib/hooks/use-cards'
import { useFixedExpenses } from '@/lib/hooks/use-fixed-expenses'
import { CurrencyInput } from '@/components/ui/currency-input'
import { useExchangeRate } from '@/lib/hooks/use-exchange-rate'
import { useToast } from '@/components/ui/toast'
import { formatMXN } from '@/lib/utils/currency'
import { todayMX } from '@/lib/utils/dates'
import type { FixedExpense } from '@/types/database'

interface FixedExpenseFormProps {
  expense?: FixedExpense
  onSuccess?: () => void
}

export function FixedExpenseForm({ expense, onSuccess }: FixedExpenseFormProps) {
  const [isMsi, setIsMsi] = useState(expense ? (expense.is_msi !== false && expense.total_months > 1) : true)
  const [description, setDescription] = useState(expense?.description ?? '')
  const [totalAmount, setTotalAmount] = useState(expense?.total_amount?.toString() ?? '')
  const [totalMonths, setTotalMonths] = useState(expense?.total_months?.toString() ?? '')
  const [monthlyAmount, setMonthlyAmount] = useState(expense?.monthly_amount?.toString() ?? '')
  const [cardId, setCardId] = useState<string | null>(expense?.card_id ?? null)
  const [startDate, setStartDate] = useState(expense?.start_date ?? todayMX())
  const [endDate, setEndDate] = useState(expense?.end_date ?? '')
  const [category, setCategory] = useState(expense?.category ?? 'otros')
  const [currency, setCurrency] = useState<'MXN' | 'USD'>((expense?.currency as 'MXN' | 'USD') ?? 'MXN')
  const [loading, setLoading] = useState(false)

  const isEditing = !!expense

  const { cards } = useCards()
  const { addExpense, updateExpense } = useFixedExpenses()
  const { rate: exchangeRate } = useExchangeRate()
  const { toast } = useToast()

  const msiMonthly = totalAmount && totalMonths
    ? parseFloat(totalAmount) / parseInt(totalMonths)
    : 0

  const msiMonthlyMxn = currency === 'USD' && exchangeRate && msiMonthly
    ? msiMonthly * exchangeRate
    : null

  const monthlyMxn = currency === 'USD' && exchangeRate && monthlyAmount
    ? parseFloat(monthlyAmount) * exchangeRate
    : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    let data: Record<string, unknown>

    if (isMsi) {
      const total = parseFloat(totalAmount)
      const months = parseInt(totalMonths)
      const rawMonthly = Math.round((total / months) * 100) / 100
      const finalTotal = currency === 'USD' && exchangeRate ? total * exchangeRate : total
      const finalMonthly = currency === 'USD' && exchangeRate ? rawMonthly * exchangeRate : rawMonthly
      data = {
        description,
        total_amount: Math.round(finalTotal * 100) / 100,
        monthly_amount: Math.round(finalMonthly * 100) / 100,
        total_months: months,
        card_id: cardId,
        start_date: startDate,
        end_date: null,
        is_msi: true,
        category,
        status: 'active',
        currency,
        exchange_rate: currency === 'USD' ? exchangeRate : null,
      }
    } else {
      const monthly = parseFloat(monthlyAmount)
      const finalMonthly = currency === 'USD' && exchangeRate ? monthly * exchangeRate : monthly
      data = {
        description,
        total_amount: Math.round(finalMonthly * 100) / 100,
        monthly_amount: Math.round(finalMonthly * 100) / 100,
        total_months: 1,
        card_id: cardId,
        start_date: startDate,
        end_date: endDate || null,
        is_msi: false,
        category,
        status: 'active',
        currency,
        exchange_rate: currency === 'USD' ? exchangeRate : null,
      }
    }

    let result
    if (isEditing) {
      result = await updateExpense(expense.id, data)
    } else {
      result = await addExpense(data)
    }
    setLoading(false)

    if (result?.error) {
      const msg = result.error.message || 'Error al guardar'
      console.error('[Nummo] Error gasto fijo:', result.error)
      toast(msg, 'error')
      return
    }

    toast(isEditing ? 'Gasto fijo actualizado' : 'Gasto fijo registrado', 'success')
    onSuccess?.()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="block text-sm font-medium text-foreground">Tipo de gasto fijo</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsMsi(true)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
              isMsi ? 'border-accent bg-accent/10 text-accent' : 'border-border text-muted hover:border-gray-300'
            }`}
          >
            MSI (Meses sin intereses)
          </button>
          <button
            type="button"
            onClick={() => setIsMsi(false)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
              !isMsi ? 'border-accent bg-accent/10 text-accent' : 'border-border text-muted hover:border-gray-300'
            }`}
          >
            Gasto mensual
          </button>
        </div>
      </div>

      <Input
        id="description"
        label="Descripción"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={isMsi ? 'Ej: Laptop, Refrigerador' : 'Ej: Renta, Spotify, Gym'}
        required
      />

      {isMsi ? (
        <>
          <div className="space-y-2">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <CurrencyInput
                  id="totalAmount"
                  label="Monto total"
                  value={totalAmount}
                  onChange={setTotalAmount}
                  placeholder="15,000"
                  required
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
            {currency === 'USD' && exchangeRate && totalAmount && (
              <p className="text-xs text-muted">
                Equivale a {formatMXN(parseFloat(totalAmount) * exchangeRate)} MXN (TC: ${exchangeRate.toFixed(2)})
              </p>
            )}
          </div>

          <Input
            id="totalMonths"
            label="Meses (MSI)"
            type="number"
            min="2"
            max="48"
            value={totalMonths}
            onChange={(e) => setTotalMonths(e.target.value)}
            placeholder="12"
            required
          />

          {msiMonthly > 0 && (
            <div className="bg-accent/10 text-accent rounded-lg px-3 py-2 text-sm font-medium">
              Mensualidad: {currency === 'USD' ? `$${msiMonthly.toFixed(2)} USD` : formatMXN(msiMonthly)}
              {msiMonthlyMxn != null && (
                <span className="block text-xs font-normal mt-0.5">
                  ≈ {formatMXN(msiMonthlyMxn)} MXN al tipo de cambio actual
                </span>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-2">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <CurrencyInput
                id="monthlyAmount"
                label="Monto mensual"
                value={monthlyAmount}
                onChange={setMonthlyAmount}
                placeholder="500"
                required
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
          {monthlyMxn != null && (
            <p className="text-xs text-muted">
              Equivale a {formatMXN(monthlyMxn)} MXN (TC: ${exchangeRate?.toFixed(2)})
            </p>
          )}
        </div>
      )}

      <CardSelector cards={cards} value={cardId} onChange={setCardId} />

      <div className="grid grid-cols-2 gap-3">
        <Input
          id="startDate"
          label="Fecha de inicio"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        {!isMsi && (
          <Input
            id="endDate"
            label="Fecha de fin (opcional)"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        )}
      </div>

      <CategoryPicker type="expense" value={category} onChange={setCategory} />

      <Button type="submit" loading={loading} className="w-full" size="lg">
        {isEditing ? 'Guardar cambios' : 'Registrar gasto fijo'}
      </Button>
    </form>
  )
}
