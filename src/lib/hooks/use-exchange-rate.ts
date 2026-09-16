'use client'

import { useEffect, useState } from 'react'

export function useExchangeRate() {
  const [rate, setRate] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function fetchRate() {
      setLoading(true)
      try {
        const res = await fetch('/api/exchange-rate')
        const data = await res.json()
        if (data.rate) setRate(data.rate)
      } catch {
        console.warn('[Nummo] No se pudo obtener tipo de cambio')
      }
      setLoading(false)
    }
    fetchRate()
  }, [])

  return { rate, loading }
}
