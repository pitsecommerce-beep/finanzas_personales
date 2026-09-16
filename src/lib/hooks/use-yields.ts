'use client'

import { useEffect, useRef } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { todayMX } from '@/lib/utils/dates'

const YIELD_LIMIT = 25000

export function useYields() {
  const processed = useRef(false)

  useEffect(() => {
    if (processed.current) return
    processed.current = true
    applyYields()
  }, [])
}

async function applyYields() {
  if (!isSupabaseConfigured()) return

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: cards } = await supabase
    .from('cards')
    .select('*')
    .eq('has_yields', true)
    .in('card_type', ['savings'])
    .not('yield_rate', 'is', null)
    .not('balance', 'is', null)

  if (!cards?.length) return

  const todayStr = todayMX()
  const today = new Date(todayStr + 'T00:00:00')

  for (const card of cards) {
    const lastDate = card.last_yield_date
      ? new Date(card.last_yield_date + 'T00:00:00')
      : null

    if (!lastDate) continue
    if (lastDate >= today) continue

    const diffMs = today.getTime() - lastDate.getTime()
    const pendingDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (pendingDays <= 0) continue

    const annualRate = card.yield_rate / 100
    const aboveRate = (card.yield_rate_above_limit ?? 0) / 100
    let currentBalance = card.balance
    let totalYield = 0

    for (let i = 0; i < pendingDays; i++) {
      let dayYield: number
      if (currentBalance <= YIELD_LIMIT) {
        dayYield = currentBalance * annualRate / 365
      } else {
        const yieldOnLimit = YIELD_LIMIT * annualRate / 365
        const yieldAbove = (currentBalance - YIELD_LIMIT) * aboveRate / 365
        dayYield = yieldOnLimit + yieldAbove
      }
      dayYield = Math.round(dayYield * 100) / 100
      totalYield += dayYield
      currentBalance += dayYield
    }

    if (totalYield <= 0) continue
    totalYield = Math.round(totalYield * 100) / 100

    await supabase.from('transactions').insert({
      user_id: user.id,
      card_id: card.id,
      amount: totalYield,
      description: `Rendimientos ${card.alias} (${pendingDays} día${pendingDays > 1 ? 's' : ''})`,
      category: 'rendimientos',
      type: 'income',
      date: todayStr,
      is_recurring: false,
      installment_months: null,
      installment_current: null,
      notes: null,
      is_transfer: false,
      currency: 'MXN',
    })

    await supabase
      .from('cards')
      .update({
        balance: Math.round(currentBalance * 100) / 100,
        last_yield_date: todayStr,
      })
      .eq('id', card.id)
  }
}
