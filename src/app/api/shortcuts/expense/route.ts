import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { todayMX } from '@/lib/utils/dates'

const EXPENSE_CATEGORIES = [
  'restaurante','transporte','despensa','entretenimiento','salud',
  'educacion','servicios','ropa','hogar','mascotas','viajes',
  'regalos','suscripciones','cafe','gimnasio','otros',
] as const

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createSupabaseAdmin(url, key)
}

async function categorize(merchant: string, apiKey: string): Promise<string> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 30,
        messages: [{ role: 'user', content: `Clasifica este comercio en UNA sola categoría. Comercio: "${merchant}". Categorías: ${EXPENSE_CATEGORIES.join(', ')}. Responde SOLO con la categoría, sin explicación.` }],
      }),
    })
    if (!res.ok) return 'otros'
    const data = await res.json()
    const cat = data.content?.[0]?.text?.trim().toLowerCase()
    return EXPENSE_CATEGORIES.includes(cat as typeof EXPENSE_CATEGORIES[number]) ? cat : 'otros'
  } catch {
    return 'otros'
  }
}

export async function POST(request: NextRequest) {
  const supabase = getAdminClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Servicio no configurado' }, { status: 503 })
  }

  const auth = request.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) {
    return NextResponse.json({ error: 'Token requerido' }, { status: 401 })
  }

  const { data: tokenRow } = await supabase
    .from('shortcuts_tokens')
    .select('user_id, is_active')
    .eq('token', token)
    .single()

  if (!tokenRow || !tokenRow.is_active) {
    return NextResponse.json({ error: 'Token inválido o desactivado' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const amount = Number(body.amount)
  const merchant = String(body.merchant || body.description || '')
  const cardHint = String(body.card || '')
  const date = (body.date as string) || todayMX()

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: 'Monto inválido' }, { status: 400 })
  }
  if (!merchant) {
    return NextResponse.json({ error: 'Comercio/descripción requerido' }, { status: 400 })
  }

  let cardId: string | null = null
  let matchedCard: string | null = null

  if (cardHint) {
    const { data: cards } = await supabase
      .from('cards')
      .select('id, alias, last_four_digits, bank_name, card_type')
      .eq('user_id', tokenRow.user_id)

    if (cards?.length) {
      const hint = cardHint.toLowerCase().trim()
      const digits = hint.replace(/\D/g, '').slice(-4)

      const match = cards.find(c => {
        if (digits.length === 4 && c.last_four_digits === digits) return true
        const alias = (c.alias || '').toLowerCase()
        const bank = (c.bank_name || '').toLowerCase()
        return alias.includes(hint) || bank.includes(hint) || hint.includes(alias)
      })

      if (match) {
        cardId = match.id
        matchedCard = match.alias
      }
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  const category = apiKey ? await categorize(merchant, apiKey) : 'otros'

  const { error } = await supabase.from('transactions').insert({
    user_id: tokenRow.user_id,
    amount,
    description: merchant,
    category,
    type: 'expense',
    card_id: cardId,
    date,
    is_recurring: false,
    installment_months: null,
    installment_current: null,
    notes: 'Registrado desde Apple Shortcuts',
    is_transfer: false,
    currency: 'MXN',
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    message: `Gasto registrado: $${amount} - ${merchant} (${category})${matchedCard ? ` en ${matchedCard}` : ''}`,
  })
}
