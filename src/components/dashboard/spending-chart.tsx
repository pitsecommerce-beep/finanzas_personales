'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { formatMXN } from '@/lib/utils/currency'
import type { LedgerEntry } from '@/types/database'

const COLORS = [
  '#14B8A6', '#3B82F6', '#8B5CF6', '#EC4899', '#F97316',
  '#EF4444', '#10B981', '#6366F1', '#F59E0B', '#06B6D4',
  '#84CC16', '#E879F9', '#FB923C', '#A78BFA', '#34D399',
  '#F472B6',
]

interface SpendingChartProps {
  entries: LedgerEntry[]
}

export function SpendingChart({ entries }: SpendingChartProps) {
  const expenses = entries.filter((e) => e.entry_type === 'expense')

  const byCategory = expenses.reduce<Record<string, { amount: number; label: string; emoji: string }>>((acc, e) => {
    const slug = e.category?.slug ?? 'otros'
    const label = e.category?.label ?? 'Otros'
    const emoji = e.category?.emoji ?? '📦'
    if (!acc[slug]) acc[slug] = { amount: 0, label, emoji }
    acc[slug].amount += Math.abs(Number(e.amount))
    return acc
  }, {})

  const data = Object.entries(byCategory)
    .map(([slug, info]) => ({
      category: slug,
      name: `${info.emoji} ${info.label}`,
      value: info.amount,
    }))
    .sort((a, b) => b.value - a.value)

  const total = data.reduce((sum, d) => sum + d.value, 0)

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-border p-6 text-center text-muted">
        <p className="text-3xl mb-2">📊</p>
        <p className="text-sm">Registra gastos para ver el desglose</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-border p-4">
      <h3 className="font-semibold text-sm mb-4">Gastos por categoría</h3>
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="w-48 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => formatMXN(Number(value))}
                contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 space-y-2 w-full max-h-52 overflow-y-auto">
          {data.map((item, i) => (
            <div key={item.category} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <span className="flex-1 truncate">{item.name}</span>
              <span className="font-medium">{formatMXN(item.value)}</span>
              <span className="text-xs text-muted w-10 text-right">
                {Math.round((item.value / total) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
