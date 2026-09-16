import { createClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const TOOLS = [
  {
    name: 'add_expense',
    description: 'Registra un gasto. Requiere monto, descripción y categoría. Opcionalmente tarjeta, fecha y meses sin intereses.',
    input_schema: {
      type: 'object' as const,
      properties: {
        amount: { type: 'number' as const, description: 'Monto en MXN' },
        description: { type: 'string' as const, description: 'Descripción del gasto' },
        category: {
          type: 'string' as const,
          enum: ['restaurante','transporte','despensa','entretenimiento','salud','educacion','servicios','ropa','hogar','mascotas','viajes','regalos','suscripciones','cafe','gimnasio','otros'],
        },
        card_id: { type: 'string' as const, description: 'UUID de la tarjeta. Si no se especifica, queda null.' },
        date: { type: 'string' as const, description: 'Fecha YYYY-MM-DD. Si no se dice, usa hoy.' },
        installment_months: { type: 'number' as const, description: 'Meses sin intereses (2-48). Solo para tarjetas de crédito.' },
      },
      required: ['amount', 'description', 'category'],
    },
  },
  {
    name: 'add_income',
    description: 'Registra un ingreso puntual.',
    input_schema: {
      type: 'object' as const,
      properties: {
        amount: { type: 'number' as const, description: 'Monto en MXN' },
        description: { type: 'string' as const, description: 'Descripción del ingreso' },
        category: {
          type: 'string' as const,
          enum: ['nomina','freelance','negocio','inversiones','rendimientos','renta','venta','otros'],
        },
        card_id: { type: 'string' as const, description: 'UUID de la tarjeta destino' },
        date: { type: 'string' as const, description: 'Fecha YYYY-MM-DD' },
      },
      required: ['amount', 'description', 'category'],
    },
  },
  {
    name: 'add_fixed_expense',
    description: 'Registra un gasto fijo mensual recurrente o a meses sin intereses (MSI).',
    input_schema: {
      type: 'object' as const,
      properties: {
        description: { type: 'string' as const },
        monthly_amount: { type: 'number' as const, description: 'Monto mensual en MXN' },
        total_months: { type: 'number' as const, description: 'Número de meses. 1 para recurrente, 2-48 para MSI.' },
        is_msi: { type: 'boolean' as const, description: 'true si son meses sin intereses' },
        category: {
          type: 'string' as const,
          enum: ['restaurante','transporte','despensa','entretenimiento','salud','educacion','servicios','ropa','hogar','mascotas','viajes','regalos','suscripciones','cafe','gimnasio','otros'],
        },
        card_id: { type: 'string' as const, description: 'UUID de la tarjeta' },
        start_date: { type: 'string' as const, description: 'Fecha inicio YYYY-MM-DD' },
      },
      required: ['description', 'monthly_amount', 'category'],
    },
  },
  {
    name: 'add_income_source',
    description: 'Registra una fuente de ingreso fija (nómina, freelance, negocio, etc.).',
    input_schema: {
      type: 'object' as const,
      properties: {
        description: { type: 'string' as const, description: 'Nombre del ingreso' },
        amount: { type: 'number' as const, description: 'Monto aproximado' },
        frequency: { type: 'string' as const, enum: ['weekly','biweekly','monthly'] },
        income_type: { type: 'string' as const, enum: ['salary','freelance','business','investment','rental','other'] },
        card_id: { type: 'string' as const, description: 'UUID de la cuenta destino' },
        next_payment_date: { type: 'string' as const, description: 'Próximo pago YYYY-MM-DD' },
      },
      required: ['description', 'amount', 'frequency', 'income_type'],
    },
  },
  {
    name: 'add_account',
    description: 'Registra una cuenta por cobrar o por pagar.',
    input_schema: {
      type: 'object' as const,
      properties: {
        type: { type: 'string' as const, enum: ['receivable','payable'], description: 'receivable = por cobrar, payable = por pagar' },
        person_name: { type: 'string' as const, description: 'Nombre de la persona' },
        description: { type: 'string' as const },
        amount: { type: 'number' as const },
        due_date: { type: 'string' as const, description: 'Fecha límite YYYY-MM-DD' },
      },
      required: ['type', 'person_name', 'amount'],
    },
  },
  {
    name: 'ask_user',
    description: 'Pregunta al usuario cuando falta información para completar el registro. Usa esto cuando no tengas datos suficientes.',
    input_schema: {
      type: 'object' as const,
      properties: {
        question: { type: 'string' as const, description: 'La pregunta para el usuario' },
      },
      required: ['question'],
    },
  },
]

async function executeTool(
  toolName: string,
  input: Record<string, unknown>,
  userId: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
  cards: Array<{ id: string; alias: string; card_type: string }>
) {
  const today = new Date().toISOString().split('T')[0]

  switch (toolName) {
    case 'add_expense': {
      const data = {
        user_id: userId,
        amount: input.amount as number,
        description: input.description as string,
        category: input.category as string,
        type: 'expense',
        card_id: (input.card_id as string) || null,
        date: (input.date as string) || today,
        is_recurring: false,
        installment_months: (input.installment_months as number) || null,
        installment_current: input.installment_months ? 1 : null,
        notes: null,
        is_transfer: false,
        transfer_from_card_id: null,
        transfer_to_card_id: null,
        currency: 'MXN',
        exchange_rate: null,
      }
      const { error } = await supabase.from('transactions').insert(data)
      if (error) return `Error: ${error.message}`

      if (data.card_id) {
        const card = cards.find(c => c.id === data.card_id)
        if (card?.card_type === 'credit') {
          await supabase.rpc('increment_field', { row_id: data.card_id, table_name: 'cards', field_name: 'used_credit', amount: data.amount })
            .then(() => {}, () => {
              supabase.from('cards').update({ used_credit: data.amount }).eq('id', data.card_id!)
            })
        }
      }

      return `Gasto registrado: $${data.amount} - ${data.description}`
    }

    case 'add_income': {
      const data = {
        user_id: userId,
        amount: input.amount as number,
        description: input.description as string,
        category: (input.category as string) || 'otros',
        type: 'income',
        card_id: (input.card_id as string) || null,
        date: (input.date as string) || today,
        is_recurring: false,
        installment_months: null,
        installment_current: null,
        notes: null,
        is_transfer: false,
        transfer_from_card_id: null,
        transfer_to_card_id: null,
        currency: 'MXN',
        exchange_rate: null,
      }
      const { error } = await supabase.from('transactions').insert(data)
      if (error) return `Error: ${error.message}`
      return `Ingreso registrado: $${data.amount} - ${data.description}`
    }

    case 'add_fixed_expense': {
      const months = (input.total_months as number) || 1
      const monthly = input.monthly_amount as number
      const data = {
        user_id: userId,
        description: input.description as string,
        total_amount: (input.is_msi ? monthly * months : monthly),
        monthly_amount: monthly,
        total_months: months,
        card_id: (input.card_id as string) || null,
        start_date: (input.start_date as string) || today,
        end_date: null,
        is_msi: (input.is_msi as boolean) || false,
        category: (input.category as string) || 'otros',
        status: 'active',
        currency: 'MXN',
        exchange_rate: null,
      }
      const { error } = await supabase.from('fixed_expenses').insert(data)
      if (error) return `Error: ${error.message}`
      return `Gasto fijo registrado: $${monthly}/mes - ${data.description}`
    }

    case 'add_income_source': {
      const data = {
        user_id: userId,
        description: input.description as string,
        amount: input.amount as number,
        frequency: (input.frequency as string) || 'monthly',
        income_type: (input.income_type as string) || 'other',
        card_id: (input.card_id as string) || null,
        next_payment_date: (input.next_payment_date as string) || null,
      }
      const { error } = await supabase.from('income_sources').insert(data)
      if (error) return `Error: ${error.message}`
      return `Fuente de ingreso registrada: $${data.amount} (${data.frequency}) - ${data.description}`
    }

    case 'add_account': {
      const data = {
        user_id: userId,
        type: input.type as string,
        person_name: input.person_name as string,
        description: (input.description as string) || '',
        amount: input.amount as number,
        due_date: (input.due_date as string) || null,
        is_paid: false,
      }
      const { error } = await supabase.from('accounts').insert(data)
      if (error) return `Error: ${error.message}`
      const label = data.type === 'receivable' ? 'Cuenta por cobrar' : 'Cuenta por pagar'
      return `${label} registrada: $${data.amount} - ${data.person_name}`
    }

    case 'ask_user':
      return `PREGUNTA: ${input.question}`

    default:
      return 'Herramienta no reconocida'
  }
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'BD no configurada' }, { status: 503 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY no configurada' }, { status: 500 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { text, conversation } = await request.json()

  const { data: cardsData } = await supabase
    .from('cards')
    .select('id, alias, card_type, bank_name, balance')
    .eq('user_id', user.id)

  const cards = cardsData ?? []

  const cardsContext = cards.map(c =>
    `- ${c.alias} (${c.bank_name}, ${c.card_type}, id: ${c.id}${c.balance != null ? `, saldo: $${c.balance}` : ''})`
  ).join('\n')

  const systemPrompt = `Eres el asistente de voz de Nummo, una app de finanzas personales.
El usuario te dicta por voz lo que quiere registrar. Tu trabajo es interpretar su mensaje y usar las herramientas para registrar gastos, ingresos, gastos fijos, fuentes de ingreso o cuentas por cobrar/pagar.

REGLAS:
- Si falta información esencial (monto, descripción), usa ask_user para preguntar
- Si el usuario menciona una tarjeta por nombre, busca el ID en la lista de tarjetas
- Si dice "a meses" o "MSI", usa installment_months en add_expense o is_msi en add_fixed_expense
- Si dice "me deben" o "le presté a", es cuenta por cobrar (receivable)
- Si dice "le debo" o "tengo que pagar", es cuenta por pagar (payable)
- Si dice "gasto fijo" o "pago mensual" o "renta" o "servicio recurrente", usa add_fixed_expense
- Si dice "me pagan" o "mi sueldo" o "nómina", usa add_income_source para ingresos fijos
- Responde siempre en español, de forma breve
- La fecha de hoy es ${new Date().toISOString().split('T')[0]}

TARJETAS DEL USUARIO:
${cardsContext || 'No tiene tarjetas registradas'}
`

  const messages = conversation ?? [{ role: 'user', content: text }]

  try {
    let response = await callClaude(apiKey, systemPrompt, messages)

    const actions: string[] = []
    let maxIterations = 5

    while (maxIterations > 0) {
      maxIterations--

      const stopReason = response.stop_reason
      if (stopReason !== 'tool_use') break

      const toolUseBlocks = response.content.filter((b: { type: string }) => b.type === 'tool_use')
      const toolResults = []

      for (const block of toolUseBlocks) {
        if (block.name === 'ask_user') {
          const question = (block.input as Record<string, string>).question
          return NextResponse.json({
            question,
            conversation: [
              ...messages,
              { role: 'assistant', content: response.content },
            ],
          })
        }

        const result = await executeTool(block.name, block.input as Record<string, unknown>, user.id, supabase, cards)
        actions.push(result)
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: result,
        })
      }

      const newMessages = [
        ...messages,
        { role: 'assistant', content: response.content },
        { role: 'user', content: toolResults },
      ]

      response = await callClaude(apiKey, systemPrompt, newMessages)
    }

    const textBlocks = response.content
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { text: string }) => b.text)
      .join('')

    return NextResponse.json({
      message: textBlocks,
      actions,
    })
  } catch (err) {
    console.error('[Nummo] Voice process error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al procesar' },
      { status: 500 }
    )
  }
}

async function callClaude(apiKey: string, system: string, messages: unknown[]) {
  const body = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system,
    tools: TOOLS,
    messages,
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
  }
  if (process.env.ANTHROPIC_WORKSPACE_ID) {
    headers['anthropic-workspace-id'] = process.env.ANTHROPIC_WORKSPACE_ID
  }

  let res: Response
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
  } catch (fetchErr) {
    console.error('[Nummo] Claude fetch error:', fetchErr)
    throw new Error('No se pudo conectar con el servicio de IA')
  }

  if (!res.ok) {
    const errText = await res.text()
    console.error('[Nummo] Claude API error:', res.status, errText)
    throw new Error(`Error de IA (${res.status}): ${errText.slice(0, 200)}`)
  }

  return res.json()
}
