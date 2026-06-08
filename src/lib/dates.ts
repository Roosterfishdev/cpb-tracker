import { format, parse } from 'date-fns'

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

export function getLastNDays(n: number, from: Date = new Date()): DateKey[] {
  const keys: DateKey[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(from)
    d.setDate(d.getDate() - i)
    keys.push(formatKey(d))
  }
  return keys
}
