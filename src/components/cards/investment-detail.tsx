'use client'

import { useEffect, useState } from 'react'
import { formatMXN } from '@/lib/utils/currency'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { Card } from '@/types/database'

interface InvestmentDetailProps {
  card: Card
}

interface StockData {
  price: number
  name: string
  currency: string
}

export function InvestmentDetail({ card }: InvestmentDetailProps) {
  const [stock, setStock] = useState<StockData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!card.investment_ticker) {
      setLoading(false)
      return
    }

    async function fetchPrice() {
      try {
        const res = await fetch(`/api/stock-price?ticker=${card.investment_ticker}`)
        if (!res.ok) {
          const data = await res.json()
          setError(data.error ?? 'Error al obtener precio')
          setLoading(false)
          return
        }
        const data = await res.json()
        setStock({ price: data.price, name: data.name, currency: data.currency })
      } catch {
        setError('No se pudo conectar al servicio de precios')
      }
      setLoading(false)
    }

    fetchPrice()
  }, [card.investment_ticker])

  const shares = card.investment_shares ?? 0
  const buyPrice = card.investment_buy_price ?? 0
  const totalInvested = shares * buyPrice

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-border p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-6 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
    )
  }

  if (error || !stock) {
    return (
      <div className="bg-white rounded-xl border border-border p-4">
        <p className="text-xs text-muted mb-1">Inversión: {card.investment_ticker}</p>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div>
            <p className="text-xs text-muted">Invertido</p>
            <p className="text-lg font-bold">{formatMXN(totalInvested)}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Títulos</p>
            <p className="text-lg font-bold">{shares}</p>
          </div>
        </div>
        {error && <p className="text-xs text-danger mt-2">{error}</p>}
      </div>
    )
  }

  const currentValue = shares * stock.price
  const gain = currentValue - totalInvested
  const gainPct = totalInvested > 0 ? (gain / totalInvested) * 100 : 0
  const isPositive = gain > 0
  const isNeutral = gain === 0

  const GainIcon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown
  const gainColor = isNeutral ? 'text-muted' : isPositive ? 'text-success' : 'text-danger'
  const gainBg = isNeutral ? 'bg-gray-50 border-gray-200' : isPositive ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-muted">{stock.name}</p>
            <p className="text-sm font-medium">{card.investment_ticker} en {card.investment_platform}</p>
          </div>
          <p className="text-lg font-bold">${stock.price.toFixed(2)} <span className="text-xs text-muted">{stock.currency}</span></p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <p className="text-xs text-muted">Títulos</p>
            <p className="font-semibold">{shares}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Precio compra</p>
            <p className="font-semibold">${buyPrice.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Invertido</p>
            <p className="font-semibold">{formatMXN(totalInvested)}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Valor actual</p>
            <p className="font-semibold">{formatMXN(currentValue)}</p>
          </div>
        </div>
      </div>

      <div className={`rounded-xl border p-4 ${gainBg}`}>
        <div className="flex items-center gap-2">
          <GainIcon size={20} className={gainColor} />
          <div>
            <p className="text-xs text-muted">Ganancia / Pérdida</p>
            <p className={`text-xl font-bold ${gainColor}`}>
              {isPositive ? '+' : ''}{formatMXN(gain)} ({gainPct >= 0 ? '+' : ''}{gainPct.toFixed(2)}%)
            </p>
          </div>
        </div>
        {card.investment_buy_date && (
          <p className="text-xs text-muted mt-1">Desde {card.investment_buy_date}</p>
        )}
      </div>
    </div>
  )
}
