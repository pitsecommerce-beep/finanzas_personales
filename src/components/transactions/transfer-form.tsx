'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CurrencyInput } from '@/components/ui/currency-input'
import { useAccounts } from '@/lib/data/accounts'
import { useLedger } from '@/lib/data/ledger'
import { useToast } from '@/components/ui/toast'
import { todayMX } from '@/lib/utils/dates'
import type { Account } from '@/types/database'

interface TransferFormProps {
  onSuccess?: () => void
}

function accountLabel(account: Account): string {
  if (account.account_type === 'cash') return account.alias
  if (account.account_type === 'voucher') return `${account.alias} (${account.institution})`
  const digits = account.last_four ? ` ****${account.last_four}` : ''
  return `${account.alias} (${account.institution ?? ''}${digits})`
}

const TYPE_LABELS: Record<string, string> = {
  credit_card: 'Credito',
  debit: 'Debito',
  cash: 'Efectivo',
  savings: 'Ahorro',
  voucher: 'Vales',
  investment: 'Inversion',
}

export function TransferForm({ onSuccess }: TransferFormProps) {
  const [fromAccountId, setFromAccountId] = useState<string>('')
  const [toAccountId, setToAccountId] = useState<string>('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(todayMX())
  const [loading, setLoading] = useState(false)

  const { accounts } = useAccounts()
  const { addTransfer } = useLedger()
  const { toast } = useToast()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const numAmount = parseFloat(amount)
    if (!numAmount || numAmount <= 0) {
      toast('Ingresa un monto valido', 'error')
      return
    }
    if (!fromAccountId || !toAccountId) {
      toast('Selecciona cuenta de origen y destino', 'error')
      return
    }
    if (fromAccountId === toAccountId) {
      toast('Origen y destino deben ser diferentes', 'error')
      return
    }

    setLoading(true)

    const toAccount = accounts.find(a => a.id === toAccountId)
    const isCreditPayment = toAccount?.account_type === 'credit_card'

    const result = await addTransfer({
      fromAccountId,
      toAccountId,
      amount: numAmount,
      description: description || (isCreditPayment ? 'Pago a tarjeta de credito' : 'Traspaso entre cuentas'),
      date,
      categorySlug: isCreditPayment ? 'pago_credito' : 'traspaso',
    })

    setLoading(false)

    if (result?.error) {
      toast('Error al registrar traspaso', 'error')
      return
    }

    toast(isCreditPayment ? 'Pago registrado' : 'Traspaso registrado', 'success')
    onSuccess?.()
  }

  const grouped: Record<string, Account[]> = {}
  for (const account of accounts) {
    const type = TYPE_LABELS[account.account_type] ?? account.account_type
    if (!grouped[type]) grouped[type] = []
    grouped[type].push(account)
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
        label="Descripcion (opcional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Ej: Pago mensual tarjeta"
      />

      <div className="space-y-1">
        <label className="block text-sm font-medium text-foreground">Cuenta de origen</label>
        <select
          value={fromAccountId}
          onChange={(e) => setFromAccountId(e.target.value)}
          required
          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        >
          <option value="">Seleccionar</option>
          {Object.entries(grouped).map(([type, items]) => (
            <optgroup key={type} label={type}>
              {items.map((acc) => (
                <option key={acc.id} value={acc.id}>{accountLabel(acc)}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-foreground">Cuenta destino</label>
        <select
          value={toAccountId}
          onChange={(e) => setToAccountId(e.target.value)}
          required
          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        >
          <option value="">Seleccionar</option>
          {Object.entries(grouped).map(([type, items]) => (
            <optgroup key={type} label={type}>
              {items.map((acc) => (
                <option key={acc.id} value={acc.id}>{accountLabel(acc)}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {accounts.find(a => a.id === toAccountId)?.account_type === 'credit_card' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700">
          Este traspaso se registra como pago a la deuda de la tarjeta de credito.
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
