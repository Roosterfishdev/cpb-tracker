import Dexie, { type EntityTable } from 'dexie'
import { todayKey } from './dates'
import {
  DEFAULT_MEAL_SLOTS,
  type MealSlot,
  isMealSlotArray,
  migrateMealSlotsFromStrings,
} from './mealSlots'
import { blobToBase64, base64ToBlob } from './imageCompress'

export type WeightUnit = 'kg' | 'lb'

export interface Settings {
  id: 1
  startDate: string
  weightUnit: WeightUnit
  mealSlots: MealSlot[]
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

export interface MealPhoto {
  id?: number
  date: string
  slotId: string
  blob: Blob
  createdAt: string
}

export { DEFAULT_MEAL_SLOTS }

class CPBDatabase extends Dexie {
  settings!: EntityTable<Settings, 'id'>
  days!: EntityTable<Day, 'date'>
  meals!: EntityTable<Meal, 'id'>
  exercise!: EntityTable<Exercise, 'id'>
  checkins!: EntityTable<Checkin, 'date'>
  achievements!: EntityTable<Achievement, 'id'>
  mealPhotos!: EntityTable<MealPhoto, 'id'>

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

    this.version(2)
      .stores({
        settings: 'id',
        days: 'date',
        meals: '++id, date, [date+slot]',
        exercise: '++id, date',
        checkins: 'date',
        achievements: 'id',
        mealPhotos: '++id, date, slotId, [date+slotId]',
      })
      .upgrade(async (tx) => {
        const settings = await tx.table('settings').get(1)
        if (!settings) return

        const raw = settings.mealSlots as unknown
        if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === 'string') {
          const newSlots = migrateMealSlotsFromStrings(raw as string[])
          await tx.table('settings').update(1, { mealSlots: newSlots })

          const nameToId = new Map(newSlots.map((s) => [s.name, s.id]))
          const meals = await tx.table('meals').toArray()
          for (const meal of meals) {
            const mapped = nameToId.get(meal.slot)
            if (mapped && mapped !== meal.slot) {
              await tx.table('meals').update(meal.id, { slot: mapped })
            }
          }
        }
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
          mealSlots: DEFAULT_MEAL_SLOTS.map((s) => ({ ...s })),
        })
      } else if (!isMealSlotArray(existing.mealSlots)) {
        const raw = existing.mealSlots as unknown
        if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === 'string') {
          const newSlots = migrateMealSlotsFromStrings(raw as string[])
          await db.settings.update(1, { mealSlots: newSlots })
          const nameToId = new Map(newSlots.map((s) => [s.name, s.id]))
          const meals = await db.meals.toArray()
          for (const meal of meals) {
            const mapped = nameToId.get(meal.slot)
            if (mapped && mapped !== meal.slot) {
              await db.meals.update(meal.id!, { slot: mapped })
            }
          }
        }
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
  slotId: string,
  updates: Partial<Omit<Meal, 'id' | 'date' | 'slot'>>,
): Promise<void> {
  const existing = await db.meals.where({ date, slot: slotId }).first()
  if (existing?.id) {
    await db.meals.update(existing.id, updates)
  } else {
    await db.meals.add({
      date,
      slot: slotId,
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

export async function upsertMealPhoto(
  date: string,
  slotId: string,
  blob: Blob,
): Promise<number> {
  const existing = await db.mealPhotos
    .where('[date+slotId]')
    .equals([date, slotId])
    .first()
  const createdAt = new Date().toISOString()
  if (existing?.id) {
    await db.mealPhotos.update(existing.id, { blob, createdAt })
    return existing.id
  }
  return db.mealPhotos.add({ date, slotId, blob, createdAt })
}

export async function deleteMealPhoto(id: number): Promise<void> {
  await db.mealPhotos.delete(id)
}

export async function getMealPhoto(
  date: string,
  slotId: string,
): Promise<MealPhoto | undefined> {
  return db.mealPhotos.where('[date+slotId]').equals([date, slotId]).first()
}

export async function exportAllData(): Promise<Record<string, unknown[]>> {
  const photos = await db.mealPhotos.toArray()
  const exportedPhotos = await Promise.all(
    photos.map(async (p) => ({
      id: p.id,
      date: p.date,
      slotId: p.slotId,
      createdAt: p.createdAt,
      blobBase64: await blobToBase64(p.blob),
    })),
  )

  return {
    settings: await db.settings.toArray(),
    days: await db.days.toArray(),
    meals: await db.meals.toArray(),
    exercise: await db.exercise.toArray(),
    checkins: await db.checkins.toArray(),
    achievements: await db.achievements.toArray(),
    mealPhotos: exportedPhotos,
  }
}

export async function importAllData(data: Record<string, unknown[]>): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.settings,
      db.days,
      db.meals,
      db.exercise,
      db.checkins,
      db.achievements,
      db.mealPhotos,
    ],
    async () => {
      await db.settings.clear()
      await db.days.clear()
      await db.meals.clear()
      await db.exercise.clear()
      await db.checkins.clear()
      await db.achievements.clear()
      await db.mealPhotos.clear()

      if (Array.isArray(data.settings)) {
        const settingsRows = data.settings as Settings[]
        for (const row of settingsRows) {
          if (row.mealSlots && !isMealSlotArray(row.mealSlots)) {
            const raw = row.mealSlots as unknown
            if (Array.isArray(raw) && typeof raw[0] === 'string') {
              row.mealSlots = migrateMealSlotsFromStrings(raw as string[])
            }
          }
        }
        await db.settings.bulkAdd(settingsRows)
      }
      if (Array.isArray(data.days)) await db.days.bulkAdd(data.days as Day[])
      if (Array.isArray(data.meals)) await db.meals.bulkAdd(data.meals as Meal[])
      if (Array.isArray(data.exercise)) await db.exercise.bulkAdd(data.exercise as Exercise[])
      if (Array.isArray(data.checkins)) await db.checkins.bulkAdd(data.checkins as Checkin[])
      if (Array.isArray(data.achievements)) {
        await db.achievements.bulkAdd(data.achievements as Achievement[])
      }
      if (Array.isArray(data.mealPhotos)) {
        const photos = data.mealPhotos as Array<{
          id?: number
          date: string
          slotId: string
          createdAt: string
          blobBase64: string
        }>
        await db.mealPhotos.bulkAdd(
          photos.map((p) => ({
            date: p.date,
            slotId: p.slotId,
            createdAt: p.createdAt,
            blob: base64ToBlob(p.blobBase64),
          })),
        )
      }
    },
  )
  seedPromise = null
  await ensureSeeded()
}

export async function resetAllData(): Promise<void> {
  await db.delete()
  await db.open()
  seedPromise = null
  await ensureSeeded()
}
