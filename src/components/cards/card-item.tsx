'use client'

import type { Card } from '@/types/database'
import { CreditCard, Wallet, Banknote, Trash2, Pencil } from 'lucide-react'
import { formatMXN } from '@/lib/utils/currency'

interface CardItemProps {
  card: Card
  onEdit?: (card: Card) => void
  onDelete?: (id: string) => void
}

const TYPE_LABELS: Record<string, string> = {
  credit: 'Crédito',
  debit: 'Débito',
  cash: 'Efectivo',
}

export function CardItem({ card, onEdit, onDelete }: CardItemProps) {
  const Icon = card.card_type === 'cash' ? Banknote : card.card_type === 'debit' ? Wallet : CreditCard

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
            {TYPE_LABELS[card.card_type] ?? card.card_type}
          </span>
          {onEdit && (
            <button onClick={() => onEdit(card)} className="text-white/60 hover:text-white p-1">
              <Pencil size={14} />
            </button>
          )}
          {onDelete && (
            <button onClick={() => onDelete(card.id)} className="text-white/60 hover:text-white p-1">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="relative">
        {card.card_type === 'cash' ? (
          <div />
        ) : (
          <p className="text-lg tracking-widest font-mono">
            &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; {card.last_four_digits ?? '&&bull;&bull;&bull;&bull;'}
          </p>
        )}
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
          {card.balance != null && (
            <div>
              <p className="text-white/60">Saldo</p>
              <p className="font-medium">{formatMXN(card.balance)}</p>
            </div>
          )}
        </div>
        <Icon size={24} className="text-white/40" />
      </div>
    </div>
  )
}
