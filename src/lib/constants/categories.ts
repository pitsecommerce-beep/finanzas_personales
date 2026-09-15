export const EXPENSE_CATEGORIES = [
  { id: 'restaurante', label: 'Restaurante', emoji: '🍽️' },
  { id: 'transporte', label: 'Transporte', emoji: '🚗' },
  { id: 'despensa', label: 'Despensa', emoji: '🛒' },
  { id: 'entretenimiento', label: 'Entretenimiento', emoji: '🎬' },
  { id: 'salud', label: 'Salud', emoji: '💊' },
  { id: 'educacion', label: 'Educación', emoji: '📚' },
  { id: 'servicios', label: 'Servicios', emoji: '💡' },
  { id: 'ropa', label: 'Ropa', emoji: '👕' },
  { id: 'hogar', label: 'Hogar', emoji: '🏠' },
  { id: 'mascotas', label: 'Mascotas', emoji: '🐾' },
  { id: 'viajes', label: 'Viajes', emoji: '✈️' },
  { id: 'regalos', label: 'Regalos', emoji: '🎁' },
  { id: 'suscripciones', label: 'Suscripciones', emoji: '📱' },
  { id: 'cafe', label: 'Café', emoji: '☕' },
  { id: 'gimnasio', label: 'Gimnasio', emoji: '💪' },
  { id: 'otros', label: 'Otros', emoji: '📦' },
] as const

export const INCOME_CATEGORIES = [
  { id: 'nomina', label: 'Nómina', emoji: '💼' },
  { id: 'freelance', label: 'Freelance', emoji: '💻' },
  { id: 'negocio', label: 'Negocio', emoji: '🏢' },
  { id: 'inversiones', label: 'Inversiones', emoji: '📈' },
  { id: 'otros', label: 'Otros', emoji: '💰' },
] as const

export type ExpenseCategoryId = typeof EXPENSE_CATEGORIES[number]['id']
export type IncomeCategoryId = typeof INCOME_CATEGORIES[number]['id']

export function getCategoryEmoji(categoryId: string): string {
  const all = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]
  return all.find(c => c.id === categoryId)?.emoji ?? '📦'
}

export function getCategoryLabel(categoryId: string): string {
  const all = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]
  return all.find(c => c.id === categoryId)?.label ?? 'Otros'
}
