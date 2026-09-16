'use client'

import type { Card } from '@/types/database'
import { getNextPaymentDate, daysUntil } from '@/lib/utils/dates'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface UpcomingPaymentsProps {
  cards: Card[]
}

function CardIcon({ color }: { color: string }) {
  return (
    <div className="w-8 h-8 rounded-lg relative overflow-hidden" style={{ backgroundColor: color }}>
      <div
        className="absolute w-10 h-10 rounded-full opacity-30"
        style={{ background: 'white', top: -4, right: -4 }}
      />
      <div
        className="absolute w-5 h-5 rounded-full opacity-20"
        style={{ background: 'white', bottom: -2, left: -2 }}
      />
      <div
        className="absolute w-3 h-3 rounded-sm opacity-40"
        style={{ background: 'white', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(45deg)' }}
      />
    </div>
  )
}

export function UpcomingPayments({ cards }: UpcomingPaymentsProps) {
  if (cards.length === 0) {
    return null
  }

  const upcoming = cards
    .filter((card) => card.payment_day != null)
    .map((card) => {
      const paymentDate = getNextPaymentDate(card.payment_day!)
      const days = daysUntil(paymentDate)
      return { card, paymentDate, days }
    })
    .sort((a, b) => a.days - b.days)

  if (upcoming.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-border p-4">
      <h3 className="font-semibold text-sm mb-3">Próximos pagos</h3>
      <div className="space-y-3">
        {upcoming.map(({ card, paymentDate, days }) => (
          <div key={card.id} className="flex items-center gap-3">
            <CardIcon color={card.color} />
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
