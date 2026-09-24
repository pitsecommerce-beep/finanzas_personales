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

  const { pdf_base64, account_id } = await request.json()

  if (!pdf_base64 || !account_id) {
    return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 })
  }

  const { data: account } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', account_id)
    .eq('user_id', user.id)
    .single()

  if (!account || account.account_type !== 'credit_card') {
    return NextResponse.json({ error: 'Cuenta no encontrada o no es tarjeta de crédito' }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key no configurada' }, { status: 500 })
  }

  const prompt = `Analiza este estado de cuenta de tarjeta de crédito y extrae la información en formato JSON estricto.

Datos de la tarjeta:
- Alias: ${account.alias}
- Institución: ${account.institution ?? 'No especificada'}
- Límite de crédito: ${account.credit_limit ?? 'No especificado'}
- Día de corte: ${account.cut_off_day ?? 'No especificado'}
- Día de pago: ${account.payment_day ?? 'No especificado'}

Extrae EXACTAMENTE este JSON (sin markdown, sin texto adicional, solo el JSON):
{
  "period_start": "YYYY-MM-DD",
  "period_end": "YYYY-MM-DD",
  "payment_due_date": "YYYY-MM-DD",
  "total_amount": 0.00,
  "minimum_payment": 0.00,
  "no_interest_payment": 0.00,
  "previous_balance": 0.00,
  "payments_received": 0.00,
  "new_purchases_total": 0.00,
  "interest_charged": 0.00,
  "fees_charged": 0.00,
  "credit_limit": 0.00,
  "available_credit": 0.00,
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "texto",
      "amount": 0.00,
      "is_msi": false,
      "msi_months": null,
      "msi_monthly_amount": null,
      "category_hint": "slug de categoría"
    }
  ],
  "installment_summary": [
    {
      "description": "texto",
      "total_amount": 0.00,
      "monthly_amount": 0.00,
      "total_months": 0,
      "remaining_months": 0,
      "start_date": "YYYY-MM-DD"
    }
  ]
}

Reglas:
- "total_amount" es el saldo total a pagar (pago para no generar intereses).
- "no_interest_payment" es el pago para no generar intereses del periodo.
- "minimum_payment" es el pago mínimo.
- Las transacciones con MSI deben tener is_msi=true, msi_months con el total de meses, y msi_monthly_amount con lo que se paga por mes.
- En installment_summary incluye TODAS las compras a meses sin intereses activas que aparezcan en el estado.
- IMPORTANTE sobre remaining_months en MSI: cuando el estado de cuenta dice "pago 2 de 3" significa que el pago 2 TODAVIA NO se ha cobrado, se cobrará en la fecha de pago de ESTE periodo. Por lo tanto remaining_months debe ser 2 (faltan el pago 2 y el 3). En general, si dice "pago N de M", remaining_months = M - N + 1.
- Para category_hint usa uno de estos slugs: supermercado, restaurantes, transporte, entretenimiento, salud, educacion, ropa, hogar, servicios, suscripciones, gasolina, mascotas, viajes, regalos, otros.
- Los montos siempre positivos.
- Si no encuentras algún dato, usa null.`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: pdf_base64,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Nummo] Error Claude API:', errorText)
      return NextResponse.json({ error: `Error al analizar: ${response.status}` }, { status: 500 })
    }

    const data = await response.json()
    const text = data.content?.[0]?.text ?? ''

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'No se pudo extraer información del PDF' }, { status: 422 })
    }

    const parsed = JSON.parse(jsonMatch[0])

    return NextResponse.json({
      analysis: parsed,
      account: {
        id: account.id,
        alias: account.alias,
        institution: account.institution,
        credit_limit: account.credit_limit,
      },
    })
  } catch (err) {
    console.error('[Nummo] Error al procesar estado de cuenta:', err)
    return NextResponse.json({ error: 'Error al procesar el estado de cuenta' }, { status: 500 })
  }
}
