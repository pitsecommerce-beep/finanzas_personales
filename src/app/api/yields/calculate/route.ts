import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createSupabaseAdmin(url, key)
}

function getMexicoCityDate(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
}

function shouldCalculateToday(
  compounding: string,
  lastApplied: string | null,
  today: string
): boolean {
  if (lastApplied === today) return false

  if (compounding === 'daily') return true

  const [y, m, d] = today.split('-').map(Number)
  const todayDate = new Date(y, m - 1, d)

  if (!lastApplied) return true

  const [ly, lm] = lastApplied.split('-').map(Number)

  if (compounding === 'monthly') {
    return y !== ly || m !== lm
  }

  if (compounding === 'quarterly') {
    const currentQ = Math.floor((m - 1) / 3)
    const lastQ = Math.floor((lm - 1) / 3)
    return y !== ly || currentQ !== lastQ
  }

  if (compounding === 'annual') {
    return y !== ly
  }

  return true
}

function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number)
  const [ty, tm, td] = to.split('-').map(Number)
  const f = new Date(fy, fm - 1, fd)
  const t = new Date(ty, tm - 1, td)
  return Math.round((t.getTime() - f.getTime()) / 86400000)
}

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')

  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`

  if (!isCron) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = getAdminClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase no configurado' }, { status: 503 })
  }

  const today = getMexicoCityDate()

  const { data: accounts, error: accErr } = await supabase
    .from('accounts_v2')
    .select('id, user_id, interest_rate_annual, yield_compounding, last_yield_applied_on, isr_withholding_rate')
    .eq('yields_enabled', true)
    .eq('is_active', true)

  if (accErr) {
    console.error('[Nummo] Error fetching yield accounts:', accErr)
    return NextResponse.json({ error: 'Error consultando cuentas' }, { status: 500 })
  }

  if (!accounts || accounts.length === 0) {
    return NextResponse.json({ message: 'Sin cuentas con rendimientos habilitados', processed: 0 })
  }

  const { data: rendimientosCategory } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', 'rendimientos')
    .single()

  const categoryId = rendimientosCategory?.id ?? null

  const results: { account_id: string; yield_amount: number; isr: number; net: number }[] = []
  const errors: { account_id: string; error: string }[] = []

  for (const account of accounts) {
    try {
      const compounding = account.yield_compounding ?? 'daily'
      if (!shouldCalculateToday(compounding, account.last_yield_applied_on, today)) {
        continue
      }

      const { data: balanceRow } = await supabase
        .from('v_account_balances')
        .select('current_balance')
        .eq('account_id', account.id)
        .single()

      const balance = Number(balanceRow?.current_balance ?? 0)
      if (balance <= 0) continue

      const { data: tiers } = await supabase
        .from('account_yield_tiers')
        .select('min_balance, annual_rate')
        .eq('account_id', account.id)
        .order('min_balance', { ascending: false })

      let annualRate = Number(account.interest_rate_annual ?? 0)

      if (tiers && tiers.length > 0) {
        const applicableTier = tiers.find(t => balance >= Number(t.min_balance))
        if (applicableTier) {
          annualRate = Number(applicableTier.annual_rate)
        }
      }

      if (annualRate <= 0) continue

      const daysToCompute = compounding === 'daily'
        ? 1
        : daysBetween(account.last_yield_applied_on ?? today, today) || 1

      const grossYield = balance * (annualRate / 100) * (daysToCompute / 365)
      const isrRate = Number(account.isr_withholding_rate ?? 0.00145)
      const isrWithholding = balance * (isrRate / 365) * daysToCompute
      const netYield = Math.max(0, grossYield - isrWithholding)

      if (netYield < 0.0001) continue

      const idempotencyKey = `yield_${account.id}_${today}`
      const occurredAt = `${today}T14:00:00-06:00`

      const roundedNet = Math.round(netYield * 10000) / 10000
      const roundedGross = Math.round(grossYield * 10000) / 10000
      const roundedIsr = Math.round(isrWithholding * 10000) / 10000

      const { error: insertErr } = await supabase
        .from('ledger_entries')
        .insert({
          user_id: account.user_id,
          account_id: account.id,
          entry_type: 'yield',
          amount: roundedNet,
          currency: 'MXN',
          description: `Rendimiento ${today}`,
          category_id: categoryId,
          occurred_on: today,
          occurred_at: occurredAt,
          source: 'system',
          idempotency_key: idempotencyKey,
          notes: `Bruto: ${roundedGross}, ISR: ${roundedIsr}, Tasa: ${annualRate}%, Días: ${daysToCompute}`,
        })

      if (insertErr) {
        if (insertErr.code === '23505') {
          continue
        }
        throw insertErr
      }

      await supabase
        .from('accounts_v2')
        .update({ last_yield_applied_on: today })
        .eq('id', account.id)

      results.push({
        account_id: account.id,
        yield_amount: roundedGross,
        isr: roundedIsr,
        net: roundedNet,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[Nummo] Error yield for ${account.id}:`, msg)
      errors.push({ account_id: account.id, error: msg })
    }
  }

  return NextResponse.json({
    date: today,
    processed: results.length,
    results,
    errors: errors.length > 0 ? errors : undefined,
  })
}
