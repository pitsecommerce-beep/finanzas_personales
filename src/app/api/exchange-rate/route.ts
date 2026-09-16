import { NextResponse } from 'next/server'

const CACHE_DURATION = 3600 * 1000

let cachedRate: { rate: number; timestamp: number } | null = null

export async function GET() {
  if (cachedRate && Date.now() - cachedRate.timestamp < CACHE_DURATION) {
    return NextResponse.json({
      rate: cachedRate.rate,
      cached: true,
      updated: new Date(cachedRate.timestamp).toISOString(),
    })
  }

  try {
    const res = await fetch(
      'https://open.er-api.com/v6/latest/USD',
      { next: { revalidate: 3600 } }
    )

    if (!res.ok) throw new Error(`API responded with ${res.status}`)

    const data = await res.json()
    const mxnRate = data.rates?.MXN

    if (!mxnRate) throw new Error('MXN rate not found in response')

    cachedRate = { rate: mxnRate, timestamp: Date.now() }

    return NextResponse.json({
      rate: mxnRate,
      cached: false,
      updated: new Date().toISOString(),
    })
  } catch (err) {
    console.warn('[Nummo] Error al obtener tipo de cambio:', err)

    if (cachedRate) {
      return NextResponse.json({
        rate: cachedRate.rate,
        cached: true,
        stale: true,
        updated: new Date(cachedRate.timestamp).toISOString(),
      })
    }

    return NextResponse.json(
      { error: 'No se pudo obtener el tipo de cambio' },
      { status: 502 }
    )
  }
}
