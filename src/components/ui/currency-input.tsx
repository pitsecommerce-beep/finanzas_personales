'use client'

import { useState, useCallback } from 'react'

interface CurrencyInputProps {
  id?: string
  label?: string
  value: string
  onChange: (raw: string) => void
  placeholder?: string
  required?: boolean
  className?: string
  large?: boolean
}

function formatWithCommas(value: string): string {
  if (!value) return ''
  const parts = value.split('.')
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  if (parts.length > 1) {
    const decimals = parts[1].slice(0, 4)
    return `${intPart}.${decimals}`
  }
  return intPart
}

function stripCommas(value: string): string {
  return value.replace(/,/g, '')
}

export function CurrencyInput({
  id,
  label,
  value,
  onChange,
  placeholder = '0.00',
  required,
  className = '',
  large = false,
}: CurrencyInputProps) {
  const [display, setDisplay] = useState(() => formatWithCommas(value))

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^0-9.,]/g, '')
      const cleaned = stripCommas(raw)
      if (cleaned && !/^\d*\.?\d{0,4}$/.test(cleaned)) return
      setDisplay(formatWithCommas(cleaned))
      onChange(cleaned)
    },
    [onChange]
  )

  const handleBlur = useCallback(() => {
    if (!value) return
    const num = parseFloat(value)
    if (isNaN(num)) return
    const formatted = num.toFixed(2)
    setDisplay(formatWithCommas(formatted))
    onChange(formatted)
  }, [value, onChange])

  if (large) {
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-foreground">
            {label}
            {required && <span className="ml-0.5">*</span>}
          </label>
        )}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-lg">$</span>
          <input
            id={id}
            type="text"
            inputMode="decimal"
            value={display}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder={placeholder}
            required={required}
            className={`w-full rounded-lg border border-border bg-white pl-8 pr-3 py-3 text-2xl font-semibold text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 ${className}`}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-foreground">
          {label}
          {required && <span className="ml-0.5">*</span>}
        </label>
      )}
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={display}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        required={required}
        className={`w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-colors ${className}`}
      />
    </div>
  )
}
