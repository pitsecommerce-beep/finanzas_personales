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

  let configRes, leRes, acctRes, ipRes, rrRes
  try {
    ;[configRes, leRes, acctRes, ipRes, rrRes] = await Promise.all([
      supabase.from('ai_config').select('*').eq('user_id', user.id).single(),
      supabase.from('ledger_entries').select('*, category:categories(slug)')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .not('entry_type', 'eq', 'transfer')
        .order('occurred_on', { ascending: false }).limit(100),
      supabase.from('accounts').select('*').eq('user_id', user.id).eq('is_active', true),
      supabase.from('installment_plans').select('*').eq('user_id', user.id).eq('is_active', true),
      supabase.from('recurring_rules').select('*').eq('user_id', user.id).eq('is_active', true),
    ])
  } catch (err) {
    console.warn('[Nummo] Error al cargar datos para IA:', err)
    return NextResponse.json({ error: 'Error al cargar datos financieros' }, { status: 500 })
  }

  const systemPrompt = configRes.data?.system_prompt ??
    'Eres un asesor financiero personal. Tienes acceso a los datos financieros del usuario. Ofrece consejos practicos, identifica patrones de gasto, y sugiere formas de ahorrar. Responde siempre en espanol y de forma amigable.'

  const entries = leRes.data ?? []
  const accounts = acctRes.data ?? []
  const installments = ipRes.data ?? []
  const incomeRules = rrRes.data ?? []

  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const monthlyExpenses = entries
    .filter((e: any) => e.entry_type === 'expense' && e.occurred_on.startsWith(thisMonth))
    .reduce((sum: number, e: any) => sum + Math.abs(Number(e.amount)), 0)
  const monthlyIncome = entries
    .filter((e: any) => e.entry_type === 'income' && e.occurred_on.startsWith(thisMonth))
    .reduce((sum: number, e: any) => sum + Number(e.amount), 0)

  const categoryBreakdown = entries
    .filter((e: any) => e.entry_type === 'expense' && e.occurred_on.startsWith(thisMonth))
    .reduce<Record<string, number>>((acc, e: any) => {
      const cat = e.category?.slug ?? 'otros'
      acc[cat] = (acc[cat] ?? 0) + Math.abs(Number(e.amount))
      return acc
    }, {})

  const financialContext = `
DATOS FINANCIEROS DEL USUARIO:
- Gastos este mes: $${monthlyExpenses.toFixed(2)} MXN
- Ingresos este mes: $${monthlyIncome.toFixed(2)} MXN
- Balance: $${(monthlyIncome - monthlyExpenses).toFixed(2)} MXN
- Cuentas: ${accounts.length} (${accounts.map((a: any) => `${a.alias} - ${a.institution ?? ''} (${a.account_type})`).join(', ')})
- Gastos fijos activos: ${installments.length} (total mensual: $${installments.reduce((s: number, ip: any) => s + Number(ip.monthly_amount), 0).toFixed(2)})
- Fuentes de ingreso: ${incomeRules.filter((r: any) => r.entry_type === 'income').map((r: any) => `${r.description}: $${r.amount} (${r.frequency})`).join(', ') || 'Ninguna registrada'}
- Desglose por categoria este mes: ${Object.entries(categoryBreakdown).map(([cat, amt]) => `${cat}: $${(amt as number).toFixed(2)}`).join(', ') || 'Sin datos'}
`

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key no configurada' }, { status: 500 })
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
  }
  if (process.env.ANTHROPIC_WORKSPACE_ID) {
    headers['anthropic-workspace-id'] = process.env.ANTHROPIC_WORKSPACE_ID
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: configRes.data?.model ?? 'claude-sonnet-4-6',
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
