import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { todayMX } from '@/lib/utils/dates'
import { v4 as uuidv4 } from 'uuid'

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

function extractToken(request: NextRequest): string | null {
  const auth = request.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  const queryToken = request.nextUrl.searchParams.get('token')
  if (queryToken) return queryToken
  return null
}

async function handleExpense(request: NextRequest, params: Record<string, unknown>) {
  const startTime = Date.now()

  const supabase = getAdminClient()
  if (!supabase) {
    return respond({ error: 'Servicio no configurado' }, 503)
  }

  const token = extractToken(request)
  if (!token) {
    return respond({ error: 'Token requerido' }, 401)
  }

  const { data: tokenRow, error: tokenError } = await supabase
    .from('shortcuts_tokens')
    .select('user_id, is_active')
    .eq('token', token)
    .single()

  if (tokenError) {
    console.error('[Shortcuts] Error BD token:', tokenError.message)
  }
  if (!tokenRow || !tokenRow.is_active) {
    return respond({ error: 'Token invalido o desactivado' }, 401)
  }

  const amount = parseAmount(params.amount)
  const merchant = String(params.merchant || params.description || '').trim()
  const cardHint = String(params.card || '')
  const date = String(params.date || '') || todayMX()

  if (!amount || isNaN(amount) || amount <= 0) {
    return respond({
      error: `Monto invalido. Recibido: ${JSON.stringify(params.amount)} (${typeof params.amount})`
    }, 400)
  }

  const description = merchant || 'Gasto desde Shortcuts'

  let accountId: string | null = null
  let matchedAccount: string | null = null

  if (cardHint) {
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, alias, last_four, institution, account_type')
      .eq('user_id', tokenRow.user_id)
      .eq('is_active', true)

    if (accounts?.length) {
      const hint = cardHint.toLowerCase().trim()
      const digits = hint.replace(/\D/g, '').slice(-4)

      const match = accounts.find(a => {
        if (digits.length === 4 && a.last_four === digits) return true
        const alias = (a.alias || '').toLowerCase()
        const inst = (a.institution || '').toLowerCase()
        return alias.includes(hint) || inst.includes(hint) || hint.includes(alias)
      })

      if (match) {
        accountId = match.id
        matchedAccount = match.alias
      }
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  const categorySlug = apiKey ? await categorize(description, apiKey) : 'otros'

  let categoryId: string | null = null
  const { data: catRow } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', categorySlug)
    .single()
  if (catRow) categoryId = catRow.id

  const idempotencyKey = `shortcuts-${tokenRow.user_id}-${date}-${amount}-${description.slice(0, 30)}-${uuidv4().slice(0, 8)}`

  const { error } = await supabase.from('ledger_entries').insert({
    user_id: tokenRow.user_id,
    account_id: accountId,
    entry_type: 'expense',
    amount: -Math.abs(amount),
    description,
    category_id: categoryId,
    occurred_on: date,
    source: 'shortcuts',
    currency: 'MXN',
    notes: 'Registrado desde Apple Shortcuts',
    idempotency_key: idempotencyKey,
  })

  if (error) {
    return respond({ error: `Error al guardar: ${error.message}` }, 500)
  }

  const elapsed = Date.now() - startTime
  const msg = `$${amount} - ${description} (${categorySlug})${matchedAccount ? ` en ${matchedAccount}` : ''}`
  console.log('[Shortcuts] Guardado en', elapsed, 'ms:', msg)

  return respond({ ok: true, message: `Gasto registrado: ${msg}` }, 200)
}

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const params: Record<string, unknown> = {}
    sp.forEach((v, k) => { if (k !== 'token') params[k] = v })

    if (Object.keys(params).length === 0) {
      return respond({ ok: true, service: 'Nummo Shortcuts', timestamp: new Date().toISOString() }, 200)
    }

    return await handleExpense(request, params)
  } catch (err) {
    console.error('[Shortcuts] Error no controlado (GET):', err)
    return respond({ error: 'Error interno del servidor' }, 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const queryParams: Record<string, unknown> = {}
    sp.forEach((v, k) => { if (k !== 'token') queryParams[k] = v })

    const body = await parseBody(request)
    const params = { ...queryParams, ...body }

    return await handleExpense(request, params)
  } catch (err) {
    console.error('[Shortcuts] Error no controlado (POST):', err)
    return respond({ error: 'Error interno del servidor' }, 500)
  }
}
