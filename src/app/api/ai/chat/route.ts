import { createClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Base de datos no configurada' }, { status: 503 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { messages } = await request.json()

  let configRes, txRes, cardsRes, fixedRes, incomeRes
  try {
    ;[configRes, txRes, cardsRes, fixedRes, incomeRes] = await Promise.all([
      supabase.from('ai_config').select('*').eq('user_id', user.id).single(),
      supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(100),
      supabase.from('cards').select('*').eq('user_id', user.id),
      supabase.from('fixed_expenses').select('*').eq('user_id', user.id).eq('status', 'active'),
      supabase.from('income_sources').select('*').eq('user_id', user.id),
    ])
  } catch (err) {
    console.warn('[Nummo] Error al cargar datos para IA:', err)
    return NextResponse.json({ error: 'Error al cargar datos financieros' }, { status: 500 })
  }

  const systemPrompt = configRes.data?.system_prompt ??
    'Eres un asesor financiero personal. Tienes acceso a los datos financieros del usuario. Ofrece consejos prácticos, identifica patrones de gasto, y sugiere formas de ahorrar. Responde siempre en español y de forma amigable.'

  const transactions = txRes.data ?? []
  const cards = cardsRes.data ?? []
  const fixedExpenses = fixedRes.data ?? []
  const incomeSources = incomeRes.data ?? []

  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const monthlyExpenses = transactions
    .filter((t: any) => t.type === 'expense' && t.date.startsWith(thisMonth))
    .reduce((sum: number, t: any) => sum + Number(t.amount), 0)
  const monthlyIncome = transactions
    .filter((t: any) => t.type === 'income' && t.date.startsWith(thisMonth))
    .reduce((sum: number, t: any) => sum + Number(t.amount), 0)

  const categoryBreakdown = transactions
    .filter((t: any) => t.type === 'expense' && t.date.startsWith(thisMonth))
    .reduce<Record<string, number>>((acc, t: any) => {
      acc[t.category] = (acc[t.category] ?? 0) + Number(t.amount)
      return acc
    }, {})

  const financialContext = `
DATOS FINANCIEROS DEL USUARIO:
- Gastos este mes: $${monthlyExpenses.toFixed(2)} MXN
- Ingresos este mes: $${monthlyIncome.toFixed(2)} MXN
- Balance: $${(monthlyIncome - monthlyExpenses).toFixed(2)} MXN
- Tarjetas: ${cards.length} (${cards.map((c: any) => `${c.alias} - ${c.bank_name} (${c.card_type})`).join(', ')})
- Gastos fijos activos: ${fixedExpenses.length} (total mensual: $${fixedExpenses.reduce((s: number, e: any) => s + Number(e.monthly_amount), 0).toFixed(2)})
- Fuentes de ingreso: ${incomeSources.map((i: any) => `${i.description}: $${i.amount} (${i.frequency})`).join(', ') || 'Ninguna registrada'}
- Desglose por categoría este mes: ${Object.entries(categoryBreakdown).map(([cat, amt]) => `${cat}: $${(amt as number).toFixed(2)}`).join(', ') || 'Sin datos'}
`

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key no configurada' }, { status: 500 })
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: configRes.data?.model ?? 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: `${systemPrompt}\n\n${financialContext}`,
      messages: messages.map((m: any) => ({
        role: m.role,
        content: m.content,
      })),
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    return NextResponse.json({ error: `Error de IA: ${response.status}` }, { status: 500 })
  }

  const data = await response.json()
  const assistantMessage = data.content?.[0]?.text ?? 'No pude generar una respuesta.'

  return NextResponse.json({ message: assistantMessage })
}
