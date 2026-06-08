import Dexie, { type EntityTable } from 'dexie'
import { todayKey } from './dates'

export type WeightUnit = 'kg' | 'lb'

export interface Settings {
  id: 1
  startDate: string
  weightUnit: WeightUnit
  mealSlots: string[]
}

export interface Day {
  date: string
  notes?: string
}

export interface Meal {
  id?: number
  date: string
  slot: string
  eaten: boolean
  onPlan: boolean
  skipped?: boolean
}

export type ExerciseType = 'walking' | 'padel' | 'boxing' | 'gym' | 'other'

export interface Exercise {
  id?: number
  date: string
  didExercise: boolean
  type?: ExerciseType
  minutes?: number
  note?: string
}

export interface Checkin {
  date: string
  weight?: number
  energy?: 1 | 2 | 3 | 4 | 5
  cravings?: 1 | 2 | 3 | 4 | 5
  mood?: 1 | 2 | 3 | 4 | 5
}

export interface Achievement {
  id: string
  earnedAt?: string | null
}

export const DEFAULT_MEAL_SLOTS = ['Breakfast', 'Lunch', 'Dinner', 'Snack']

class CPBDatabase extends Dexie {
  settings!: EntityTable<Settings, 'id'>
  days!: EntityTable<Day, 'date'>
  meals!: EntityTable<Meal, 'id'>
  exercise!: EntityTable<Exercise, 'id'>
  checkins!: EntityTable<Checkin, 'date'>
  achievements!: EntityTable<Achievement, 'id'>

  constructor() {
    super('cpb-tracker')
    this.version(1).stores({
      settings: 'id',
      days: 'date',
      meals: '++id, date, [date+slot]',
      exercise: '++id, date',
      checkins: 'date',
      achievements: 'id',
    })
  }
}

export const db = new CPBDatabase()

let seedPromise: Promise<void> | null = null

export async function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = (async () => {
      const existing = await db.settings.get(1)
      if (!existing) {
        await db.settings.add({
          id: 1,
          startDate: todayKey(),
          weightUnit: 'kg',
          mealSlots: [...DEFAULT_MEAL_SLOTS],
        })
      }
    })()
  }
  await seedPromise
}

export async function getSettings(): Promise<Settings> {
  await ensureSeeded()
  const settings = await db.settings.get(1)
  if (!settings) {
    throw new Error('Settings not found after seed')
  }
  return settings
}

export async function updateSettings(
  partial: Partial<Omit<Settings, 'id'>>,
): Promise<Settings> {
  await ensureSeeded()
  await db.settings.update(1, partial)
  return getSettings()
}

export async function upsertMeal(
  date: string,
  slot: string,
  updates: Partial<Omit<Meal, 'id' | 'date' | 'slot'>>,
): Promise<void> {
  const existing = await db.meals.where({ date, slot }).first()
  if (existing?.id) {
    await db.meals.update(existing.id, updates)
  } else {
    await db.meals.add({
      date,
      slot,
      eaten: false,
      onPlan: false,
      skipped: false,
      ...updates,
    })
  }
}

export async function upsertExercise(
  date: string,
  data: Omit<Exercise, 'id' | 'date'>,
): Promise<void> {
  const existing = await db.exercise.where('date').equals(date).first()
  if (existing?.id) {
    await db.exercise.update(existing.id, data)
  } else {
    await db.exercise.add({ date, ...data })
  }
}

export async function upsertCheckin(
  date: string,
  data: Partial<Omit<Checkin, 'date'>>,
): Promise<void> {
  const existing = await db.checkins.get(date)
  if (existing) {
    await db.checkins.update(date, data)
  } else {
    await db.checkins.add({ date, ...data })
  }
}

export async function upsertDayNotes(date: string, notes: string): Promise<void> {
  const existing = await db.days.get(date)
  if (existing) {
    await db.days.update(date, { notes })
  } else {
    await db.days.add({ date, notes })
  }
}

export async function exportAllData(): Promise<Record<string, unknown[]>> {
  return {
    settings: await db.settings.toArray(),
    days: await db.days.toArray(),
    meals: await db.meals.toArray(),
    exercise: await db.exercise.toArray(),
    checkins: await db.checkins.toArray(),
    achievements: await db.achievements.toArray(),
  }
}

export async function importAllData(data: Record<string, unknown[]>): Promise<void> {
  await db.transaction(
    'rw',
    [db.settings, db.days, db.meals, db.exercise, db.checkins, db.achievements],
    async () => {
      await db.settings.clear()
      await db.days.clear()
      await db.meals.clear()
      await db.exercise.clear()
      await db.checkins.clear()
      await db.achievements.clear()

      if (Array.isArray(data.settings)) await db.settings.bulkAdd(data.settings as Settings[])
      if (Array.isArray(data.days)) await db.days.bulkAdd(data.days as Day[])
      if (Array.isArray(data.meals)) await db.meals.bulkAdd(data.meals as Meal[])
      if (Array.isArray(data.exercise)) await db.exercise.bulkAdd(data.exercise as Exercise[])
      if (Array.isArray(data.checkins)) await db.checkins.bulkAdd(data.checkins as Checkin[])
      if (Array.isArray(data.achievements)) {
        await db.achievements.bulkAdd(data.achievements as Achievement[])
      }
    },
  )
  seedPromise = null
}

export async function resetAllData(): Promise<void> {
  await db.delete()
  await db.open()
  seedPromise = null
  await ensureSeeded()
}
