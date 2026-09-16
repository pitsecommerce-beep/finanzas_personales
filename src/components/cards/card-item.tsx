'use client'

import type { Card } from '@/types/database'
import { CreditCard, Trash2, Pencil } from 'lucide-react'

interface CardItemProps {
  card: Card
  onEdit?: (card: Card) => void
  onDelete?: (id: string) => void
}

export function CardItem({ card, onEdit, onDelete }: CardItemProps) {
  return (
    <div
      className="relative rounded-xl p-5 text-white min-h-[180px] flex flex-col justify-between overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${card.color}, ${card.color}dd)`,
      }}
    >
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-8 translate-x-8" />
      <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/5 translate-y-6 -translate-x-6" />

      <div className="flex justify-between items-start relative">
        <div>
          <p className="text-xs text-white/70">{card.bank_name}</p>
          <p className="font-semibold text-lg">{card.alias}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full uppercase font-medium">
            {card.card_type === 'credit' ? 'Crédito' : 'Débito'}
          </span>
          {onEdit && (
            <button
              onClick={() => onEdit(card)}
              className="text-white/60 hover:text-white p-1"
            >
              <Pencil size={14} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(card.id)}
              className="text-white/60 hover:text-white p-1"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="relative">
        <p className="text-lg tracking-widest font-mono">
          &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; {card.last_four_digits ?? '&&bull;&bull;&bull;&bull;'}
        </p>
      </div>

      <div className="flex justify-between items-end relative">
        <div className="flex gap-6 text-xs">
          {card.cut_off_day != null && (
            <div>
              <p className="text-white/60">Corte</p>
              <p className="font-medium">Día {card.cut_off_day}</p>
            </div>
          )}
          {card.payment_day != null && (
            <div>
              <p className="text-white/60">Pago</p>
              <p className="font-medium">Día {card.payment_day}</p>
            </div>
          )}
        </div>
        <CreditCard size={24} className="text-white/40" />
      </div>
    </div>
  )
}
