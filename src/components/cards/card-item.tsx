'use client'

import type { Card } from '@/types/database'
import { CreditCard, Wallet, Banknote, Trash2, Pencil, PiggyBank, Ticket, TrendingUp, Eye } from 'lucide-react'
import { formatMXN } from '@/lib/utils/currency'

interface CardItemProps {
  card: Card
  onEdit?: (card: Card) => void
  onDelete?: (id: string) => void
  onView?: (card: Card) => void
}

const TYPE_LABELS: Record<string, string> = {
  credit: 'Crédito',
  debit: 'Débito',
  cash: 'Efectivo',
  savings: 'Ahorro',
  voucher: 'Vales',
  investment: 'Inversión',
}

function getIcon(type: string) {
  switch (type) {
    case 'cash': return Banknote
    case 'debit': return Wallet
    case 'savings': return PiggyBank
    case 'voucher': return Ticket
    case 'investment': return TrendingUp
    default: return CreditCard
  }
}

export function CardItem({ card, onEdit, onDelete, onView }: CardItemProps) {
  const Icon = getIcon(card.card_type)
  const isLight = card.color === '#F5F0E8'
  const textClass = isLight ? 'text-gray-800' : 'text-white'
  const subtextClass = isLight ? 'text-gray-500' : 'text-white/60'
  const dotClass = isLight ? 'text-gray-800' : 'text-white'
  const bgOverlay = isLight ? 'bg-black/5' : 'bg-white/10'
  const bgOverlay2 = isLight ? 'bg-black/3' : 'bg-white/5'
  const iconClass = isLight ? 'text-gray-400' : 'text-white/40'
  const btnClass = isLight ? 'text-gray-400 hover:text-gray-700' : 'text-white/60 hover:text-white'
  const badgeBg = isLight ? 'bg-black/10' : 'bg-white/20'

  return (
    <div
      className={`relative rounded-xl p-5 min-h-[180px] flex flex-col justify-between overflow-hidden ${textClass}`}
      style={{
        background: `linear-gradient(135deg, ${card.color}, ${card.color}dd)`,
      }}
    >
      <div className={`absolute top-0 right-0 w-32 h-32 rounded-full ${bgOverlay} -translate-y-8 translate-x-8`} />
      <div className={`absolute bottom-0 left-0 w-24 h-24 rounded-full ${bgOverlay2} translate-y-6 -translate-x-6`} />

      <div className="flex justify-between items-start relative">
        <div>
          <p className={`text-xs ${subtextClass}`}>{card.bank_name}</p>
          <p className="font-semibold text-lg">{card.alias}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] ${badgeBg} px-2 py-0.5 rounded-full uppercase font-medium`}>
            {TYPE_LABELS[card.card_type] ?? card.card_type}
          </span>
          {onView && (
            <button onClick={(e) => { e.stopPropagation(); onView(card) }} className={`${btnClass} p-1`} title="Ver movimientos">
              <Eye size={14} />
            </button>
          )}
          {onEdit && (
            <button onClick={(e) => { e.stopPropagation(); onEdit(card) }} className={`${btnClass} p-1`} title="Editar">
              <Pencil size={14} />
            </button>
          )}
          {onDelete && (
            <button onClick={(e) => { e.stopPropagation(); onDelete(card.id) }} className={`${btnClass} p-1`} title="Eliminar">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="relative">
        {(card.card_type === 'cash' || card.card_type === 'voucher' || card.card_type === 'investment') ? (
          <div />
        ) : (
          <p className={`text-lg tracking-widest font-mono ${dotClass}`}>
            &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; {card.last_four_digits ?? '&&bull;&bull;&bull;&bull;'}
          </p>
        )}
      </div>

      <div className="flex justify-between items-end relative">
        <div className="flex gap-6 text-xs">
          {card.cut_off_day != null && (
            <div>
              <p className={subtextClass}>Corte</p>
              <p className="font-medium">Día {card.cut_off_day}</p>
            </div>
          )}
          {card.payment_day != null && (
            <div>
              <p className={subtextClass}>Pago</p>
              <p className="font-medium">Día {card.payment_day}</p>
            </div>
          )}
          {card.balance != null && (
            <div>
              <p className={subtextClass}>Saldo</p>
              <p className="font-medium">{formatMXN(card.balance)}</p>
            </div>
          )}
          {card.credit_limit != null && card.card_type === 'credit' && (
            <div>
              <p className={subtextClass}>Disponible</p>
              <p className="font-medium">{formatMXN(card.credit_limit - (card.used_credit ?? 0))}</p>
            </div>
          )}
          {card.has_yields && card.yield_rate != null && (
            <div>
              <p className={subtextClass}>Rendimiento</p>
              <p className="font-medium">{card.yield_rate}% anual</p>
            </div>
          )}
          {card.card_type === 'investment' && card.investment_ticker && (
            <div>
              <p className={subtextClass}>Ticker</p>
              <p className="font-medium">{card.investment_ticker}</p>
            </div>
          )}
          {card.card_type === 'investment' && card.investment_shares != null && (
            <div>
              <p className={subtextClass}>Acciones</p>
              <p className="font-medium">{card.investment_shares}</p>
            </div>
          )}
        </div>
        <Icon size={24} className={iconClass} />
      </div>
    </div>
  )
}
