import { createClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { todayMX } from '@/lib/utils/dates'

const TOOLS = [
  {
    name: 'add_expense',
    description: 'Registra un gasto. Requiere monto, descripcion y categoria. Opcionalmente cuenta, fecha y meses sin intereses.',
    input_schema: {
      type: 'object' as const,
      properties: {
        amount: { type: 'number' as const, description: 'Monto en MXN' },
        description: { type: 'string' as const, description: 'Descripcion del gasto' },
        category: {
          type: 'string' as const,
          enum: ['restaurante','transporte','despensa','entretenimiento','salud','educacion','servicios','ropa','hogar','mascotas','viajes','regalos','suscripciones','cafe','gimnasio','otros'],
        },
        account_id: { type: 'string' as const, description: 'UUID de la cuenta. Si no se especifica, queda null.' },
        date: { type: 'string' as const, description: 'Fecha YYYY-MM-DD. Si no se dice, usa hoy.' },
        installment_months: { type: 'number' as const, description: 'Meses sin intereses (2-48). Solo para tarjetas de credito.' },
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
        description: { type: 'string' as const, description: 'Descripcion del ingreso' },
        category: {
          type: 'string' as const,
          enum: ['nomina','freelance','negocio','inversiones','rendimientos','renta','venta','otros'],
        },
        account_id: { type: 'string' as const, description: 'UUID de la cuenta destino' },
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
        total_months: { type: 'number' as const, description: 'Numero de meses. 1 para recurrente, 2-48 para MSI.' },
        category: {
          type: 'string' as const,
          enum: ['restaurante','transporte','despensa','entretenimiento','salud','educacion','servicios','ropa','hogar','mascotas','viajes','regalos','suscripciones','cafe','gimnasio','otros'],
        },
        account_id: { type: 'string' as const, description: 'UUID de la cuenta' },
        start_date: { type: 'string' as const, description: 'Fecha inicio YYYY-MM-DD' },
      },
      required: ['description', 'monthly_amount', 'category'],
    },
  },
  {
    name: 'add_income_source',
    description: 'Registra una fuente de ingreso fija (nomina, freelance, negocio, etc.).',
    input_schema: {
      type: 'object' as const,
      properties: {
        description: { type: 'string' as const, description: 'Nombre del ingreso' },
        amount: { type: 'number' as const, description: 'Monto aproximado' },
        frequency: { type: 'string' as const, enum: ['weekly','biweekly','monthly'] },
        account_id: { type: 'string' as const, description: 'UUID de la cuenta destino' },
        next_occurrence: { type: 'string' as const, description: 'Proximo pago YYYY-MM-DD' },
      },
      required: ['description', 'amount', 'frequency'],
    },
  },
  {
    name: 'add_debt',
    description: 'Registra una cuenta por cobrar o por pagar.',
    input_schema: {
      type: 'object' as const,
      properties: {
        type: { type: 'string' as const, enum: ['receivable','payable'], description: 'receivable = por cobrar, payable = por pagar' },
        person_name: { type: 'string' as const, description: 'Nombre de la persona' },
        description: { type: 'string' as const },
        amount: { type: 'number' as const },
        due_date: { type: 'string' as const, description: 'Fecha limite YYYY-MM-DD' },
      },
      required: ['type', 'person_name', 'amount'],
    },
  },
  {
    name: 'ask_user',
    description: 'Pregunta al usuario cuando falta informacion para completar el registro. Usa esto cuando no tengas datos suficientes.',
    input_schema: {
      type: 'object' as const,
      properties: {
        question: { type: 'string' as const, description: 'La pregunta para el usuario' },
      },
      required: ['question'],
    },
  },
]

async function resolveCategoryId(slug: string, supabase: any): Promise<string | null> {
  const { data } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', slug)
    .single()
  return data?.id ?? null
}

async function executeTool(
  toolName: string,
  input: Record<string, unknown>,
  userId: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
  accounts: Array<{ id: string; alias: string; account_type: string }>
) {
  const today = todayMX()

  switch (toolName) {
    case 'add_expense': {
      const categoryId = await resolveCategoryId((input.category as string) || 'otros', supabase)
      const data = {
        user_id: userId,
        account_id: (input.account_id as string) || null,
        entry_type: 'expense',
        amount: -Math.abs(input.amount as number),
        description: input.description as string,
        category_id: categoryId,
        occurred_on: (input.date as string) || today,
        source: 'app',
        currency: 'MXN',
      }
      const { error } = await supabase.from('ledger_entries').insert(data)
      if (error) return `Error: ${error.message}`

      if (input.installment_months) {
        const months = input.installment_months as number
        const monthly = Math.abs(input.amount as number) / months
        await supabase.from('installment_plans').insert({
          user_id: userId,
          account_id: (input.account_id as string) || null,
          description: input.description as string,
          total_amount: Math.abs(input.amount as number),
          monthly_amount: monthly,
          total_months: months,
          remaining_months: months,
          start_date: (input.date as string) || today,
          category_id: categoryId,
          currency: 'MXN',
          is_active: true,
        })
      }

      return `Gasto registrado: $${Math.abs(input.amount as number)} - ${input.description}`
    }

    case 'add_income': {
      const categoryId = await resolveCategoryId((input.category as string) || 'otros', supabase)
      const data = {
        user_id: userId,
        account_id: (input.account_id as string) || null,
        entry_type: 'income',
        amount: Math.abs(input.amount as number),
        description: input.description as string,
        category_id: categoryId,
        occurred_on: (input.date as string) || today,
        source: 'app',
        currency: 'MXN',
      }
      const { error } = await supabase.from('ledger_entries').insert(data)
      if (error) return `Error: ${error.message}`
      return `Ingreso registrado: $${data.amount} - ${data.description}`
    }

    case 'add_fixed_expense': {
      const months = (input.total_months as number) || 1
      const monthly = input.monthly_amount as number
      const categoryId = await resolveCategoryId((input.category as string) || 'otros', supabase)
      const data = {
        user_id: userId,
        account_id: (input.account_id as string) || null,
        description: input.description as string,
        total_amount: monthly * months,
        monthly_amount: monthly,
        total_months: months,
        remaining_months: months,
        start_date: (input.start_date as string) || today,
        category_id: categoryId,
        currency: 'MXN',
        is_active: true,
      }
      const { error } = await supabase.from('installment_plans').insert(data)
      if (error) return `Error: ${error.message}`
      return `Gasto fijo registrado: $${monthly}/mes - ${data.description}`
    }

    case 'add_income_source': {
      const data = {
        user_id: userId,
        account_id: (input.account_id as string) || null,
        entry_type: 'income',
        description: input.description as string,
        amount: input.amount as number,
        frequency: (input.frequency as string) || 'monthly',
        next_occurrence: (input.next_occurrence as string) || null,
        is_active: true,
        currency: 'MXN',
      }
      const { error } = await supabase.from('recurring_rules').insert(data)
      if (error) return `Error: ${error.message}`
      return `Fuente de ingreso registrada: $${data.amount} (${data.frequency}) - ${data.description}`
    }

    case 'add_debt': {
      const data = {
        user_id: userId,
        type: input.type as string,
        person_name: input.person_name as string,
        description: (input.description as string) || '',
        amount: input.amount as number,
        due_date: (input.due_date as string) || null,
        is_paid: false,
      }
      const { error } = await supabase.from('debts').insert(data)
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

  const { data: accountsData } = await supabase
    .from('accounts')
    .select('id, alias, account_type, institution')
    .eq('user_id', user.id)
    .eq('is_active', true)

  const accounts = accountsData ?? []

  const accountsContext = accounts.map(a =>
    `- ${a.alias} (${a.institution ?? ''}, ${a.account_type}, id: ${a.id})`
  ).join('\n')

  const systemPrompt = `Eres el asistente de voz de Nummo, una app de finanzas personales.
El usuario te dicta por voz lo que quiere registrar. Tu trabajo es interpretar su mensaje y usar las herramientas para registrar gastos, ingresos, gastos fijos, fuentes de ingreso o cuentas por cobrar/pagar.

REGLAS:
- Si falta informacion esencial (monto, descripcion), usa ask_user para preguntar
- Si el usuario menciona una cuenta o tarjeta por nombre, busca el ID en la lista de cuentas
- Si dice "a meses" o "MSI", usa installment_months en add_expense o add_fixed_expense
- Si dice "me deben" o "le preste a", es cuenta por cobrar (receivable)
- Si dice "le debo" o "tengo que pagar", es cuenta por pagar (payable)
- Si dice "gasto fijo" o "pago mensual" o "renta" o "servicio recurrente", usa add_fixed_expense
- Si dice "me pagan" o "mi sueldo" o "nomina", usa add_income_source para ingresos fijos
- Responde siempre en espanol, de forma breve y en texto plano (sin markdown, sin asteriscos, sin negritas)
- La fecha de hoy es ${todayMX()}

CUENTAS DEL USUARIO:
${accountsContext || 'No tiene cuentas registradas'}
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

        const result = await executeTool(block.name, block.input as Record<string, unknown>, user.id, supabase, accounts)
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
    model: 'claude-sonnet-4-6',
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
