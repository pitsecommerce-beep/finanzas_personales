'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CategoryPicker } from './category-picker'
import { CardSelector } from '@/components/cards/card-selector'
import { useAccounts } from '@/lib/data/accounts'
import { useLedger } from '@/lib/data/ledger'
import { useCategories } from '@/lib/data/categories'
import { CurrencyInput } from '@/components/ui/currency-input'
import { useExchangeRate } from '@/lib/hooks/use-exchange-rate'
import { useToast } from '@/components/ui/toast'
import { formatMXN } from '@/lib/utils/currency'
import { todayMX } from '@/lib/utils/dates'
import type { LedgerEntry, EntryType } from '@/types/database'

interface TransactionFormProps {
  type: 'expense' | 'income'
  entry?: LedgerEntry
  onSuccess?: () => void
}

export function TransactionForm({ type, entry, onSuccess }: TransactionFormProps) {
  const [amount, setAmount] = useState(() => {
    if (!entry) return ''
    if (entry.currency === 'USD' && entry.fx_rate) {
      return (Math.abs(entry.amount) / entry.fx_rate).toFixed(2)
    }
    return Math.abs(entry.amount).toString()
  })
  const [description, setDescription] = useState(entry?.description ?? '')
  const [categorySlug, setCategorySlug] = useState(entry?.category?.slug ?? (type === 'expense' ? 'otros' : 'nomina'))
  const [accountId, setAccountId] = useState<string | null>(entry?.account_id ?? null)
  const [date, setDate] = useState(entry?.occurred_on ?? todayMX())
  const [currency, setCurrency] = useState<'MXN' | 'USD'>((entry?.currency as 'MXN' | 'USD') ?? 'MXN')
  const [loading, setLoading] = useState(false)

  const isEditing = !!entry

  const { accounts } = useAccounts()
  const { addEntry, updateEntry } = useLedger()
  const { categories, getBySlug } = useCategories()
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
    const cat = getBySlug(categorySlug)

    let result
    if (isEditing) {
      result = await updateEntry(entry.id, {
        amount: type === 'expense' ? -Math.abs(finalAmount) : Math.abs(finalAmount),
        description,
        category_id: cat?.id ?? null,
        account_id: accountId,
        occurred_on: date,
        currency,
        fx_rate: currency === 'USD' ? exchangeRate : null,
        amount_original: currency === 'USD' ? numAmount : null,
        amount_base: currency === 'USD' ? finalAmount : null,
      })
    } else {
      result = await addEntry({
        amount: type === 'expense' ? -Math.abs(finalAmount) : Math.abs(finalAmount),
        description,
        category_id: cat?.id ?? null,
        entry_type: type as EntryType,
        account_id: accountId,
        occurred_on: date,
        source: 'app',
        currency,
        fx_rate: currency === 'USD' ? exchangeRate : null,
        amount_original: currency === 'USD' ? numAmount : null,
        amount_base: currency === 'USD' ? finalAmount : null,
      })
    }

    setLoading(false)

    if (result?.error) {
      const msg = result.error.message || 'Error al guardar'
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
      setCategorySlug(type === 'expense' ? 'otros' : 'nomina')
      setAccountId(null)
      setCurrency('MXN')
    }
    onSuccess?.()
  }

  const selectedAccount = accounts.find((a) => a.id === accountId)

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

      <CategoryPicker type={type} value={categorySlug} onChange={setCategorySlug} />

      <CardSelector cards={accounts} value={accountId} onChange={setAccountId} />

      <Input
        id="date"
        label="Fecha"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      <Button type="submit" loading={loading} className="w-full" size="lg">
        {isEditing ? 'Guardar cambios' : (type === 'expense' ? 'Registrar gasto' : 'Registrar ingreso')}
      </Button>
    </form>
  )
}
