'use client'

import type { Account, AccountBalance } from '@/types/database'
import { CreditCard, Wallet, Banknote, Trash2, Pencil, PiggyBank, Ticket, TrendingUp, Eye } from 'lucide-react'
import { formatMXN } from '@/lib/utils/currency'

interface CardItemProps {
  card: Account
  balance?: AccountBalance
  onEdit?: (card: Account) => void
  onDelete?: (id: string) => void
  onView?: (card: Account) => void
}

const TYPE_LABELS: Record<string, string> = {
  credit_card: 'Credito',
  debit: 'Debito',
  cash: 'Efectivo',
  savings: 'Ahorro',
  voucher: 'Vales',
  investment: 'Inversion',
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

export function CardItem({ card, balance, onEdit, onDelete, onView }: CardItemProps) {
  const Icon = getIcon(card.account_type)
  const isLight = card.color === '#F5F0E8'
  const textClass = isLight ? 'text-gray-800' : 'text-white'
  const subtextClass = isLight ? 'text-gray-500' : 'text-white/60'
  const dotClass = isLight ? 'text-gray-800' : 'text-white'
  const bgOverlay = isLight ? 'bg-black/5' : 'bg-white/10'
  const bgOverlay2 = isLight ? 'bg-black/3' : 'bg-white/5'
  const iconClass = isLight ? 'text-gray-400' : 'text-white/40'
  const btnClass = isLight ? 'text-gray-400 hover:text-gray-700' : 'text-white/60 hover:text-white'
  const badgeBg = isLight ? 'bg-black/10' : 'bg-white/20'

  const currentBalance = balance?.current_balance ?? null

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
          <p className={`text-xs ${subtextClass}`}>{card.institution}</p>
          <p className="font-semibold text-lg">{card.alias}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] ${badgeBg} px-2 py-0.5 rounded-full uppercase font-medium`}>
            {TYPE_LABELS[card.account_type] ?? card.account_type}
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
        {(card.account_type === 'cash' || card.account_type === 'voucher' || card.account_type === 'investment') ? (
          <div />
        ) : (
          <p className={`text-lg tracking-widest font-mono ${dotClass}`}>
            &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; {card.last_four ?? '&&bull;&bull;&bull;&bull;'}
          </p>
        )}
      </div>

      <div className="flex justify-between items-end relative">
        <div className="flex gap-6 text-xs">
          {card.cut_off_day != null && (
            <div>
              <p className={subtextClass}>Corte</p>
              <p className="font-medium">Dia {card.cut_off_day}</p>
            </div>
          )}
          {card.payment_day != null && (
            <div>
              <p className={subtextClass}>Pago</p>
              <p className="font-medium">Dia {card.payment_day}</p>
            </div>
          )}
          {currentBalance != null && (
            <div>
              <p className={subtextClass}>Saldo</p>
              <p className="font-medium">{formatMXN(currentBalance)}</p>
            </div>
          )}
          {card.credit_limit != null && card.account_type === 'credit_card' && currentBalance != null && (
            <div>
              <p className={subtextClass}>Disponible</p>
              <p className="font-medium">{formatMXN(card.credit_limit + currentBalance)}</p>
            </div>
          )}
          {card.yields_enabled && card.interest_rate_annual != null && (
            <div>
              <p className={subtextClass}>Rendimiento</p>
              <p className="font-medium">{card.interest_rate_annual}% anual</p>
            </div>
          )}
        </div>
        <Icon size={24} className={iconClass} />
      </div>
    </div>
  )
}
