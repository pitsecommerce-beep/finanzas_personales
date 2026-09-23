import { format, lastDayOfMonth, setDate, addMonths, subMonths, isAfter, isBefore, startOfDay, addDays } from 'date-fns'
import { es } from 'date-fns/locale'

export function todayMX(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
}

export function toNextBusinessDay(date: Date): Date {
  const dow = date.getDay()
  if (dow === 6) return addDays(date, 2)
  if (dow === 0) return addDays(date, 1)
  return date
}

export function adjustDateToBusinessDay(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const adjusted = toNextBusinessDay(date)
  return format(adjusted, 'yyyy-MM-dd')
}

export function clampDay(day: number, date: Date): Date {
  const lastDay = lastDayOfMonth(date).getDate()
  const clamped = Math.min(day, lastDay)
  return setDate(date, clamped)
}

export function getNextCutOffDate(cutOffDay: number): Date {
  const today = startOfDay(new Date())
  const thisMonth = clampDay(cutOffDay, today)

  if (isAfter(thisMonth, today) || thisMonth.getTime() === today.getTime()) {
    return thisMonth
  }
  return clampDay(cutOffDay, addMonths(today, 1))
}

export function getNextPaymentDate(paymentDay: number): Date {
  const today = startOfDay(new Date())
  const thisMonth = toNextBusinessDay(clampDay(paymentDay, today))

  if (isAfter(thisMonth, today) || thisMonth.getTime() === today.getTime()) {
    return thisMonth
  }
  return toNextBusinessDay(clampDay(paymentDay, addMonths(today, 1)))
}

export function getBillingPeriod(cutOffDay: number): { start: Date; end: Date } {
  const today = startOfDay(new Date())
  const thisMonthCutOff = clampDay(cutOffDay, today)

  if (isAfter(today, thisMonthCutOff)) {
    const nextCutOff = clampDay(cutOffDay, addMonths(today, 1))
    return {
      start: new Date(thisMonthCutOff.getTime() + 86400000),
      end: nextCutOff,
    }
  }

  const prevCutOff = clampDay(cutOffDay, subMonths(today, 1))
  return {
    start: new Date(prevCutOff.getTime() + 86400000),
    end: thisMonthCutOff,
  }
}

export function parseDateString(date: string): Date {
  return new Date(date + 'T12:00:00')
}

export function formatDateEs(date: Date | string): string {
  const d = typeof date === 'string' ? parseDateString(date) : date
  return format(d, "d 'de' MMMM 'de' yyyy", { locale: es })
}

export function formatShortDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseDateString(date) : date
  return format(d, 'dd/MM/yyyy')
}

export function daysUntil(date: Date): number {
  const today = startOfDay(new Date())
  const target = startOfDay(date)
  return Math.ceil((target.getTime() - today.getTime()) / 86400000)
}

export function getRemainingMonths(startDate: string, totalMonths: number): number {
  const start = parseDateString(startDate)
  const now = new Date()
  const monthsElapsed = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
  return Math.max(0, totalMonths - monthsElapsed)
}

export function getClosedBillingPeriod(cutOffDay: number): { start: Date; end: Date } {
  const currentPeriod = getBillingPeriod(cutOffDay)
  const closedEnd = new Date(currentPeriod.start.getTime() - 86400000)
  const prevCutOff = clampDay(cutOffDay, subMonths(closedEnd, 1))
  const closedStart = new Date(prevCutOff.getTime() + 86400000)
  return { start: closedStart, end: closedEnd }
}

export function isInBillingPeriod(transactionDate: string, cutOffDay: number): boolean {
  const date = startOfDay(parseDateString(transactionDate))
  const period = getBillingPeriod(cutOffDay)
  return (isAfter(date, period.start) || date.getTime() === period.start.getTime()) &&
         (isBefore(date, period.end) || date.getTime() === period.end.getTime())
}
