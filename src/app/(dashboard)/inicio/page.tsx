'use client'

import { useEffect, useState } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { useProfileContext } from '@/lib/context/profile-context'
import { useYields } from '@/lib/hooks/use-yields'
import { QuickEntry } from '@/components/dashboard/quick-entry'
import { VoiceEntry } from '@/components/dashboard/voice-entry'
import { SummaryCards } from '@/components/dashboard/summary-cards'
import { SpendingChart } from '@/components/dashboard/spending-chart'
import { UpcomingPayments } from '@/components/dashboard/upcoming-payments'
import { TransactionList } from '@/components/transactions/transaction-list'
import type { Transaction, Card } from '@/types/database'

export default function InicioPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const { firstName } = useProfileContext()
  useYields()

  useEffect(() => {
    async function load() {
      if (!isSupabaseConfigured()) {
        console.warn('[Nummo] Inicio: sin conexión a BD')
        setLoading(false)
        return
      }
      try {
        const supabase = createClient()
        const now = new Date()
        const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

        const [txRes, cardRes] = await Promise.all([
          supabase
            .from('transactions')
            .select('*, card:cards!transactions_card_id_fkey(*)')
            .gte('date', startOfMonth)
            .order('date', { ascending: false }),
          supabase.from('cards').select('*').order('created_at', { ascending: false }),
        ])

        setTransactions(txRes.data ?? [])
        setCards(cardRes.data ?? [])
      } catch (err) {
        console.warn('[Nummo] Error al cargar datos de inicio:', err)
      }
      setLoading(false)
    }
    load()
  }, [])

  const income = transactions
    .filter((t) => t.type === 'income' && !t.is_transfer)
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const expenses = transactions
    .filter((t) => t.type === 'expense' && !t.is_transfer)
    .reduce((sum, t) => sum + Number(t.amount), 0)

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

      <SummaryCards income={income} expenses={expenses} cards={cards} />

      <div className="grid lg:grid-cols-2 gap-6">
        <SpendingChart transactions={transactions} />
        <UpcomingPayments cards={cards} />
      </div>

      <div>
        <h2 className="font-semibold text-sm mb-3">Últimos movimientos</h2>
        <TransactionList transactions={transactions.slice(0, 10)} />
      </div>
    </div>
  )
}
