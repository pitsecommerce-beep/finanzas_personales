'use client'

import { formatMXN } from '@/lib/utils/currency'
import type { Account, AccountBalance } from '@/types/database'

interface InvestmentDetailProps {
  account: Account
  balance?: AccountBalance
}

export function InvestmentDetail({ account, balance }: InvestmentDetailProps) {
  const currentBalance = balance?.current_balance ?? account.opening_balance

  return (
    <div className="bg-white rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-muted">{account.institution ?? 'Inversión'}</p>
          <p className="text-sm font-medium">{account.alias}</p>
        </div>
        <p className="text-lg font-bold">{formatMXN(currentBalance)}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-muted">Saldo inicial</p>
          <p className="font-semibold">{formatMXN(account.opening_balance)}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Movimientos</p>
          <p className="font-semibold">{formatMXN(balance?.movements_sum ?? 0)}</p>
        </div>
      </div>

      {account.interest_rate_annual != null && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-muted">Rendimiento anual</p>
          <p className="font-semibold">{account.interest_rate_annual}%</p>
        </div>
      )}

      {account.notes && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-muted">Notas</p>
          <p className="text-sm">{account.notes}</p>
        </div>
      )}
    </div>
  )
}
