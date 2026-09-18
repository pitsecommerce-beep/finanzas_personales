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

function parseAmount(raw: unknown): number {
  if (typeof raw === 'number') return raw
  if (typeof raw !== 'string') return NaN
  const cleaned = raw.replace(/[^0-9.,\-]/g, '').trim()
  if (!cleaned) return NaN
  const hasCommaDecimal = /,\d{1,2}$/.test(cleaned) && !cleaned.includes('.')
  const normalized = hasCommaDecimal
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned.replace(/,/g, '')
  return Number(normalized)
}

async function parseBody(request: NextRequest): Promise<Record<string, unknown>> {
  const ct = (request.headers.get('content-type') ?? '').toLowerCase()
  if (ct.includes('application/json') || ct === '') {
    try {
      return await request.json()
    } catch { /* fall through */ }
  }
  if (ct.includes('form')) {
    try {
      const form = await request.formData()
      const obj: Record<string, unknown> = {}
      form.forEach((v, k) => { obj[k] = v })
      return obj
    } catch { /* fall through */ }
  }
  try {
    const text = await request.text()
    return JSON.parse(text)
  } catch {
    return {}
  }
}

async function categorize(merchant: string, apiKey: string): Promise<string> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    }
    const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID
    if (workspaceId) headers['anthropic-workspace-id'] = workspaceId

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 30,
        messages: [{ role: 'user', content: `Clasifica este comercio en UNA sola categoría. Comercio: "${merchant}". Categorías: ${EXPENSE_CATEGORIES.join(', ')}. Responde SOLO con la categoría, sin explicación.` }],
      }),
    })
    if (!res.ok) {
      console.warn('[Shortcuts] Categorización falló, status:', res.status)
      return 'otros'
    }
    const data = await res.json()
    const cat = data.content?.[0]?.text?.trim().toLowerCase()
    return EXPENSE_CATEGORIES.includes(cat as typeof EXPENSE_CATEGORIES[number]) ? cat : 'otros'
  } catch (err) {
    console.warn('[Shortcuts] Error en categorización:', err)
    return 'otros'
  }
}

function respond(data: Record<string, unknown>, status: number) {
  const isError = status >= 400
  if (isError) {
    console.error('[Shortcuts] Respuesta error:', status, JSON.stringify(data))
  } else {
    console.log('[Shortcuts] Respuesta OK:', JSON.stringify(data))
  }
  return NextResponse.json(data, { status })
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const contentType = request.headers.get('content-type') ?? '(vacío)'
  const hasAuth = !!request.headers.get('authorization')

  console.log('[Shortcuts] === Nueva petición ===')
  console.log('[Shortcuts] Content-Type:', contentType)
  console.log('[Shortcuts] Authorization presente:', hasAuth)
  console.log('[Shortcuts] User-Agent:', request.headers.get('user-agent') ?? '(vacío)')

  try {
    const supabase = getAdminClient()
    if (!supabase) {
      return respond({ error: 'Servicio no configurado (falta SUPABASE_SERVICE_ROLE_KEY)' }, 503)
    }

    const auth = request.headers.get('authorization')
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
    if (!token) {
      console.warn('[Shortcuts] Header Authorization recibido:', auth ? `"${auth.slice(0, 30)}..."` : 'null')
      return respond(
        { error: 'Token requerido. Agrega el header Authorization con valor: Bearer tu_token' },
        401,
      )
    }

    console.log('[Shortcuts] Token recibido: nmm_...', token.slice(-6))

    const { data: tokenRow, error: tokenError } = await supabase
      .from('shortcuts_tokens')
      .select('user_id, is_active')
      .eq('token', token)
      .single()

    if (tokenError) {
      console.error('[Shortcuts] Error buscando token en BD:', tokenError.message)
    }

    if (!tokenRow || !tokenRow.is_active) {
      return respond({ error: 'Token inválido o desactivado' }, 401)
    }

    console.log('[Shortcuts] Token válido, user_id:', tokenRow.user_id)

    const body = await parseBody(request)

    console.log('[Shortcuts] Body recibido:', JSON.stringify(body))
    console.log('[Shortcuts] Tipos:', {
      amount: typeof body.amount,
      merchant: typeof body.merchant,
      card: typeof body.card,
      amountValue: body.amount,
    })

    if (!body || Object.keys(body).length === 0) {
      return respond(
        { error: 'No se recibieron datos. Asegúrate de enviar el cuerpo como JSON con los campos: amount, merchant' },
        400,
      )
    }

    const amount = parseAmount(body.amount)
    const merchant = String(body.merchant || body.description || '').trim()
    const cardHint = String(body.card || '')
    const date = (body.date as string) || todayMX()

    console.log('[Shortcuts] Datos parseados:', { amount, merchant, cardHint, date })

    if (!amount || isNaN(amount) || amount <= 0) {
      return respond(
        { error: `Monto inválido. Se recibió: ${JSON.stringify(body.amount)} (tipo: ${typeof body.amount}). Envía un número positivo en el campo "amount".` },
        400,
      )
    }

    const description = merchant || 'Gasto desde Shortcuts'

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
      console.log('[Shortcuts] Tarjeta:', matchedCard ? `encontrada (${matchedCard})` : `no encontrada para "${cardHint}"`)
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    const category = apiKey ? await categorize(description, apiKey) : 'otros'

    console.log('[Shortcuts] Categoría:', category)

    const { error } = await supabase.from('transactions').insert({
      user_id: tokenRow.user_id,
      amount,
      description,
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
      return respond({ error: `Error al guardar: ${error.message}` }, 500)
    }

    const elapsed = Date.now() - startTime
    console.log('[Shortcuts] Gasto guardado en', elapsed, 'ms')

    return respond({
      ok: true,
      message: `Gasto registrado: $${amount} - ${description} (${category})${matchedCard ? ` en ${matchedCard}` : ''}`,
    }, 200)
  } catch (err) {
    console.error('[Shortcuts] Error no controlado:', err)
    return respond(
      { error: 'Error interno del servidor. Revisa los logs para más detalles.' },
      500,
    )
  }
}
