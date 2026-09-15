'use client'

import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/lib/constants/categories'

interface CategoryPickerProps {
  type: 'expense' | 'income'
  value: string
  onChange: (categoryId: string) => void
}

export function CategoryPicker({ type, value, onChange }: CategoryPickerProps) {
  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-foreground">Categoría</label>
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onChange(cat.id)}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-colors ${
              value === cat.id
                ? 'border-accent bg-accent/10 text-accent font-medium'
                : 'border-border hover:border-gray-300 text-muted'
            }`}
          >
            <span className="text-lg">{cat.emoji}</span>
            <span className="truncate w-full text-center">{cat.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
