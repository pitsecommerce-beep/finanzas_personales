'use client'

import type { Account } from '@/types/database'

interface CardSelectorProps {
  cards: Account[]
  value: string | null
  onChange: (cardId: string | null) => void
  label?: string
  filterTypes?: string[]
}

const TYPE_LABELS: Record<string, string> = {
  credit_card: 'Credito',
  debit: 'Debito',
  cash: 'Efectivo',
  savings: 'Ahorro',
  voucher: 'Vales',
  investment: 'Inversion',
}

function accountLabel(account: Account): string {
  if (account.account_type === 'cash') return account.alias
  if (account.account_type === 'voucher') return `${account.alias} (${account.institution ?? ''})`
  const digits = account.last_four ? ` ****${account.last_four}` : ''
  return `${account.alias} (${account.institution ?? ''}${digits})`
}

export function CardSelector({ cards, value, onChange, label = 'Origen / destino', filterTypes }: CardSelectorProps) {
  const filtered = filterTypes ? cards.filter(c => filterTypes.includes(c.account_type)) : cards

  const grouped: Record<string, Account[]> = {}
  for (const account of filtered) {
    const type = TYPE_LABELS[account.account_type] ?? account.account_type
    if (!grouped[type]) grouped[type] = []
    grouped[type].push(account)
  }

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-foreground">{label}</label>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
      >
        <option value="">Sin especificar</option>
        {Object.entries(grouped).map(([type, items]) => (
          <optgroup key={type} label={type}>
            {items.map((account) => (
              <option key={account.id} value={account.id}>
                {accountLabel(account)}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  )
}
