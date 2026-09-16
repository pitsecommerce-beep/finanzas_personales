'use client'

import { useEffect, useState } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, subMonths, addDays, addMonths, isBefore, isAfter } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { clampDay, toNextBusinessDay } from '@/lib/utils/dates'
import type { Card, IncomeSource, Account } from '@/types/database'

export default function CalendarioPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [cards, setCards] = useState<Card[]>([])
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])

  useEffect(() => {
    async function load() {
      if (!isSupabaseConfigured()) {
        console.warn('[Nummo] Calendario: sin conexión a BD')
        return
      }
      try {
        const supabase = createClient()
        const [c, i, a] = await Promise.all([
          supabase.from('cards').select('*'),
          supabase.from('income_sources').select('*'),
          supabase.from('accounts').select('*').eq('is_paid', false),
        ])
        setCards(c.data ?? [])
        setIncomeSources(i.data ?? [])
        setAccounts(a.data ?? [])
      } catch (err) {
        console.warn('[Nummo] Error al cargar calendario:', err)
      }
    }
    load()
  }, [])

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startDayOfWeek = getDay(monthStart)

  function getEventsForDay(day: Date) {
    const events: { label: string; color: string; type: string }[] = []
    const dayNum = day.getDate()

    const monthRef = new Date(day.getFullYear(), day.getMonth(), 1)
    const prevMonthRef = subMonths(monthRef, 1)

    cards.forEach((card) => {
      if (card.cut_off_day != null && card.cut_off_day === dayNum) {
        events.push({ label: `Corte ${card.alias}`, color: '#F59E0B', type: 'cutoff' })
      }
      if (card.payment_day != null) {
        const adjusted = toNextBusinessDay(clampDay(card.payment_day, monthRef))
        const adjustedPrev = toNextBusinessDay(clampDay(card.payment_day, prevMonthRef))
        if (isSameDay(adjusted, day) || isSameDay(adjustedPrev, day)) {
          events.push({ label: `Pago ${card.alias}`, color: '#EF4444', type: 'payment' })
        }
      }
    })

    incomeSources.forEach((src) => {
      if (!src.next_payment_date) return
      const baseDate = new Date(src.next_payment_date + 'T12:00:00')
      const stepDays = src.frequency === 'weekly' ? 7 : src.frequency === 'biweekly' ? 15 : 0
      const advance = stepDays > 0
        ? (d: Date, dir: number) => addDays(d, stepDays * dir)
        : (d: Date, dir: number) => addMonths(d, dir)

      let d = baseDate
      while (isAfter(d, monthStart)) d = advance(d, -1)
      while (!isAfter(d, monthEnd)) {
        if (!isBefore(d, monthStart) && isSameDay(d, day)) {
          events.push({ label: src.description, color: '#10B981', type: 'income' })
        }
        d = advance(d, 1)
      }
    })

    accounts.forEach((acc) => {
      if (!acc.due_date) return
      const dueDate = new Date(acc.due_date + 'T12:00:00')
      if (isSameDay(dueDate, day)) {
        const color = acc.type === 'payable' ? '#EF4444' : '#10B981'
        const prefix = acc.type === 'payable' ? 'Pagar' : 'Cobrar'
        events.push({ label: `${prefix}: ${acc.person_name}`, color, type: 'account' })
      }
    })

    return events
  }

  const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Calendario</h1>
        <div className="mt-2 bg-accent/10 border border-accent/20 rounded-lg px-3 py-2 text-sm text-accent">
          Sincronización con Google Calendar disponible próximamente
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="font-semibold capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: es })}
          </h2>
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-px">
          {weekDays.map((d) => (
            <div key={d} className="text-center text-xs font-medium text-muted py-2">{d}</div>
          ))}

          {Array.from({ length: startDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {days.map((day) => {
            const events = getEventsForDay(day)
            const isToday = isSameDay(day, new Date())

            return (
              <div
                key={day.toISOString()}
                className={`min-h-[60px] p-1 border border-border/50 rounded ${
                  isToday ? 'bg-accent/5' : ''
                }`}
              >
                <span className={`text-xs ${isToday ? 'bg-accent text-white px-1.5 py-0.5 rounded-full' : 'text-muted'}`}>
                  {day.getDate()}
                </span>
                <div className="mt-1 space-y-0.5">
                  {events.slice(0, 2).map((ev, i) => (
                    <div
                      key={i}
                      className="text-[9px] truncate px-1 py-0.5 rounded"
                      style={{ backgroundColor: `${ev.color}20`, color: ev.color }}
                    >
                      {ev.label}
                    </div>
                  ))}
                  {events.length > 2 && (
                    <p className="text-[9px] text-muted text-center">+{events.length - 2}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-muted">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-warning" />
          <span>Fecha de corte</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-danger" />
          <span>Pago / Por pagar</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-success" />
          <span>Ingreso / Por cobrar</span>
        </div>
      </div>
    </div>
  )
}
