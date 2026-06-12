import { format, parse, addDays, isAfter, startOfDay } from 'date-fns'

export type DateKey = `${number}-${string}-${string}`

export function todayKey(): DateKey {
  return formatKey(new Date())
}

export function formatKey(date: Date): DateKey {
  return format(date, 'yyyy-MM-dd') as DateKey
}

export function keyToDate(key: string): Date {
  return parse(key, 'yyyy-MM-dd', new Date())
}

export function formatDisplayDate(key: string): string {
  return format(keyToDate(key), 'EEEE, MMM d')
}

export function formatShortDate(key: string): string {
  return format(keyToDate(key), 'MMM d')
}

export function getLastNDays(n: number, from: Date = new Date()): DateKey[] {
  const keys: DateKey[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(from)
    d.setDate(d.getDate() - i)
    keys.push(formatKey(d))
  }
  return keys
}

export function shiftDateKey(key: string, days: number): DateKey {
  const d = addDays(keyToDate(key), days)
  return formatKey(d)
}

export function isValidDateKey(str: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false
  const d = keyToDate(str)
  return !Number.isNaN(d.getTime()) && formatKey(d) === str
}

export function clampToToday(key: string): DateKey {
  const today = todayKey()
  if (!isValidDateKey(key)) return today
  const d = keyToDate(key)
  if (isAfter(startOfDay(d), startOfDay(new Date()))) return today
  return key as DateKey
}

export function isTodayKey(key: string): boolean {
  return key === todayKey()
}
