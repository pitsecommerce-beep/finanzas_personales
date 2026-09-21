'use client'

import { useProfileContext } from '@/lib/context/profile-context'
import { useAccounts, useAccountBalances } from '@/lib/data/accounts'
import { useLedger } from '@/lib/data/ledger'
import { QuickEntry } from '@/components/dashboard/quick-entry'
import { VoiceEntry } from '@/components/dashboard/voice-entry'
import { SummaryCards } from '@/components/dashboard/summary-cards'
import { SpendingChart } from '@/components/dashboard/spending-chart'
import { UpcomingPayments } from '@/components/dashboard/upcoming-payments'
import { TransactionList } from '@/components/transactions/transaction-list'

export default function InicioPage() {
  const { accounts, loading: accountsLoading } = useAccounts()
  const { balances, loading: balancesLoading } = useAccountBalances()
  const { entries, loading: entriesLoading } = useLedger()
  const { firstName } = useProfileContext()

  const loading = accountsLoading || balancesLoading || entriesLoading

  const income = entries
    .filter((e) => e.entry_type === 'income')
    .reduce((sum, e) => sum + Number(e.amount), 0)

  const expenses = entries
    .filter((e) => e.entry_type === 'expense')
    .reduce((sum, e) => sum + Math.abs(Number(e.amount)), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">
          {firstName ? `Hola, ${firstName}` : 'Inicio'}
        </h1>
        <p className="text-sm text-muted">Resumen de este mes</p>
      </div>

      <QuickEntry />

      <VoiceEntry />

      <SummaryCards income={income} expenses={expenses} balances={balances} />

      <div className="grid lg:grid-cols-2 gap-6">
        <SpendingChart entries={entries} />
        <UpcomingPayments accounts={accounts} />
      </div>

      <div>
        <h2 className="font-semibold text-sm mb-3">Ultimos movimientos</h2>
        <TransactionList entries={entries.slice(0, 10)} />
      </div>
    </div>
  )
}
