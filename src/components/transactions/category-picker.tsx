'use client'

import { useCategories } from '@/lib/data/categories'

interface CategoryPickerProps {
  type: 'expense' | 'income'
  value: string
  onChange: (slug: string) => void
}

export function CategoryPicker({ type, value, onChange }: CategoryPickerProps) {
  const { getExpenseCategories, getIncomeCategories } = useCategories()
  const categories = type === 'expense' ? getExpenseCategories() : getIncomeCategories()

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-foreground">Categoria</label>
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
        {categories.map((cat) => (
          <button
            key={cat.slug}
            type="button"
            onClick={() => onChange(cat.slug)}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-colors ${
              value === cat.slug
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
