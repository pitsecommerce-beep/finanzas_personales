'use client'

import type { Card } from '@/types/database'

interface CardSelectorProps {
  cards: Card[]
  value: string | null
  onChange: (cardId: string | null) => void
  label?: string
  filterTypes?: string[]
}

const TYPE_LABELS: Record<string, string> = {
  credit: 'Crédito',
  debit: 'Débito',
  cash: 'Efectivo',
  savings: 'Ahorro',
  voucher: 'Vales',
}

function cardLabel(card: Card): string {
  if (card.card_type === 'cash') return card.alias
  if (card.card_type === 'voucher') return `${card.alias} (${card.bank_name})`
  const digits = card.last_four_digits ? ` ****${card.last_four_digits}` : ''
  return `${card.alias} (${card.bank_name}${digits})`
}

export function CardSelector({ cards, value, onChange, label = 'Origen / destino', filterTypes }: CardSelectorProps) {
  const filtered = filterTypes ? cards.filter(c => filterTypes.includes(c.card_type)) : cards

  const grouped: Record<string, Card[]> = {}
  for (const card of filtered) {
    const type = TYPE_LABELS[card.card_type] ?? card.card_type
    if (!grouped[type]) grouped[type] = []
    grouped[type].push(card)
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
            {items.map((card) => (
              <option key={card.id} value={card.id}>
                {cardLabel(card)}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  )
}
