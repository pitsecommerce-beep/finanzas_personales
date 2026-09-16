'use client'

import type { Card } from '@/types/database'

interface CardSelectorProps {
  cards: Card[]
  value: string | null
  onChange: (cardId: string | null) => void
  label?: string
}

function cardLabel(card: Card): string {
  if (card.card_type === 'cash') return card.alias
  const digits = card.last_four_digits ? ` ****${card.last_four_digits}` : ''
  return `${card.alias} (${card.bank_name}${digits})`
}

export function CardSelector({ cards, value, onChange, label = 'Origen / destino' }: CardSelectorProps) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-foreground">{label}</label>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
      >
        <option value="">Sin especificar</option>
        {cards.map((card) => (
          <option key={card.id} value={card.id}>
            {cardLabel(card)}
          </option>
        ))}
      </select>
    </div>
  )
}
