'use client'

import type { Card } from '@/types/database'
import { getNextPaymentDate, daysUntil } from '@/lib/utils/dates'
import { formatMXN } from '@/lib/utils/currency'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface UpcomingPaymentsProps {
  cards: Card[]
}

export function UpcomingPayments({ cards }: UpcomingPaymentsProps) {
  if (cards.length === 0) {
    return null
  }

  const upcoming = cards
    .map((card) => {
      const paymentDate = getNextPaymentDate(card.payment_day)
      const days = daysUntil(paymentDate)
      return { card, paymentDate, days }
    })
    .sort((a, b) => a.days - b.days)

  return (
    <div className="bg-white rounded-xl border border-border p-4">
      <h3 className="font-semibold text-sm mb-3">Próximos pagos</h3>
      <div className="space-y-3">
        {upcoming.map(({ card, paymentDate, days }) => (
          <div key={card.id} className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: card.color }}
            >
              {card.alias.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{card.alias}</p>
              <p className="text-xs text-muted">
                {format(paymentDate, "d 'de' MMMM", { locale: es })}
              </p>
            </div>
            <span
              className={`text-xs font-medium px-2 py-1 rounded-full ${
                days <= 3
                  ? 'bg-danger/10 text-danger'
                  : days <= 7
                  ? 'bg-warning/10 text-warning'
                  : 'bg-accent/10 text-accent'
              }`}
            >
              {days === 0 ? 'Hoy' : days === 1 ? 'Mañana' : `${days} días`}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
