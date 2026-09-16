import { NextRequest, NextResponse } from 'next/server'

const CACHE_DURATION = 15 * 60 * 1000

const cache = new Map<string, { price: number; name: string; currency: string; timestamp: number }>()

export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get('ticker')?.toUpperCase()
  if (!ticker) {
    return NextResponse.json({ error: 'Parámetro ticker requerido' }, { status: 400 })
  }

  const cached = cache.get(ticker)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return NextResponse.json({ ...cached, cached: true })
  }

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 900 },
      }
    )

    if (!res.ok) {
      return NextResponse.json(
        { error: `No se encontró el ticker "${ticker}"` },
        { status: 404 }
      )
    }

    const data = await res.json()
    const meta = data?.chart?.result?.[0]?.meta
    if (!meta?.regularMarketPrice) {
      return NextResponse.json(
        { error: `Sin datos para "${ticker}"` },
        { status: 404 }
      )
    }

    const result = {
      ticker,
      price: meta.regularMarketPrice,
      name: meta.shortName ?? meta.symbol ?? ticker,
      currency: meta.currency ?? 'USD',
      timestamp: Date.now(),
    }

    cache.set(ticker, result)

    return NextResponse.json({ ...result, cached: false })
  } catch (err) {
    console.warn('[Nummo] Error al obtener precio:', err)

    if (cached) {
      return NextResponse.json({ ...cached, cached: true, stale: true })
    }

    return NextResponse.json(
      { error: 'No se pudo obtener el precio' },
      { status: 502 }
    )
  }
}
