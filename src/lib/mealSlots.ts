/** Meal slot with name and 24h time (HH:mm) */
export interface MealSlot {
  id: string
  name: string
  time: string
}

export const DEFAULT_MEAL_SLOTS: MealSlot[] = [
  { id: 'breakfast', name: 'Breakfast', time: '08:00' },
  { id: 'snack-1', name: 'Snack', time: '11:00' },
  { id: 'lunch', name: 'Lunch', time: '13:00' },
  { id: 'snack-2', name: 'Snack 2', time: '16:00' },
  { id: 'dinner', name: 'Dinner', time: '19:00' },
]

export function generateSlotId(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${base || 'slot'}-${Date.now().toString(36)}`
}

export function sortMealSlots(slots: MealSlot[]): MealSlot[] {
  return [...slots].sort((a, b) => a.time.localeCompare(b.time))
}

/** Display 24h HH:mm as 12h e.g. "8:00 AM" */
export function formatTimeDisplay(time: string): string {
  const [hStr, mStr] = time.split(':')
  let h = parseInt(hStr, 10)
  const m = mStr ?? '00'
  if (Number.isNaN(h)) return time
  const period = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  if (h === 0) h = 12
  return `${h}:${m} ${period}`
}

export function formatSlotLabel(slot: MealSlot): string {
  return `${slot.name} · ${formatTimeDisplay(slot.time)}`
}

export function isMealSlotArray(value: unknown): value is MealSlot[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    typeof value[0] === 'object' &&
    value[0] !== null &&
    'id' in value[0] &&
    'name' in value[0] &&
    'time' in value[0]
  )
}

export function migrateMealSlotsFromStrings(slots: string[]): MealSlot[] {
  const defaultTimes = ['08:00', '11:00', '13:00', '16:00', '19:00']
  return slots.map((name, i) => ({
    id: generateSlotId(name),
    name,
    time: defaultTimes[i] ?? '12:00',
  }))
}
