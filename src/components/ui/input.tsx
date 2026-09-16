'use client'

import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  labelClassName?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, labelClassName, error, className = '', id, required, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={id} className={`block text-sm font-medium ${labelClassName ?? 'text-foreground'}`}>
            {label}
            {required && <span className="ml-0.5">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          required={required}
          className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-colors ${
            error ? 'border-danger' : 'border-border'
          } ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
