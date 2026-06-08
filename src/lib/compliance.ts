import { db, getSettings } from './db'
import type { MealSlot } from './mealSlots'
import { formatKey, keyToDate } from './dates'

export async function isDayCompliant(date: string): Promise<boolean> {
  const settings = await getSettings()
  const meals = await db.meals.where('date').equals(date).toArray()
  const mealMap = new Map(meals.map((m) => [m.slot, m]))

  return settings.mealSlots.every((slot) => {
    const meal = mealMap.get(slot.id)
    if (!meal) return false
    if (meal.skipped) return true
    return meal.eaten && meal.onPlan
  })
}

export async function isDayPerfect(date: string): Promise<boolean> {
  const settings = await getSettings()
  const meals = await db.meals.where('date').equals(date).toArray()
  const mealMap = new Map(meals.map((m) => [m.slot, m]))

  return settings.mealSlots.every((slot) => {
    const meal = mealMap.get(slot.id)
    return meal?.eaten === true && meal?.onPlan === true && !meal?.skipped
  })
}

export type DayStatus = 'compliant' | 'logged' | 'missed'

export async function getDayStatus(date: string): Promise<DayStatus> {
  const settings = await getSettings()
  const meals = await db.meals.where('date').equals(date).toArray()
  const mealMap = new Map(meals.map((m) => [m.slot, m]))

  const hasAnyLog = meals.some(
    (m) => m.eaten || m.onPlan || m.skipped,
  )

  if (!hasAnyLog) return 'missed'

  const allResolved = settings.mealSlots.every((slot) => {
    const meal = mealMap.get(slot.id)
    if (!meal) return false
    return meal.skipped || meal.eaten
  })

  if (!allResolved) return 'logged'

  const compliant = await isDayCompliant(date)
  return compliant ? 'compliant' : 'logged'
}

export async function getComplianceStreak(upToDate: string): Promise<number> {
  const settings = await getSettings()
  const start = keyToDate(settings.startDate)
  const end = keyToDate(upToDate)
  let streak = 0

  for (let d = new Date(end); d >= start; d.setDate(d.getDate() - 1)) {
    const key = formatKey(d)
    if (await isDayCompliant(key)) {
      streak++
    } else {
      break
    }
  }
  return streak
}

export async function getPerfectStreak(upToDate: string): Promise<number> {
  const settings = await getSettings()
  const start = keyToDate(settings.startDate)
  const end = keyToDate(upToDate)
  let streak = 0

  for (let d = new Date(end); d >= start; d.setDate(d.getDate() - 1)) {
    const key = formatKey(d)
    if (await isDayPerfect(key)) {
      streak++
    } else {
      break
    }
  }
  return streak
}

export function countOnPlanMeals(
  slots: MealSlot[],
  mealMap: Map<string, { eaten?: boolean; onPlan?: boolean; skipped?: boolean } | undefined>,
): number {
  return slots.filter((slot) => {
    const m = mealMap.get(slot.id)
    return m?.eaten && m?.onPlan && !m?.skipped
  }).length
}

export function getMealComplianceSummary(
  slots: MealSlot[],
  mealMap: Map<string, { eaten?: boolean; onPlan?: boolean; skipped?: boolean } | undefined>,
): { onPlanCount: number; total: number; percent: number } {
  const total = slots.length
  const onPlanCount = countOnPlanMeals(slots, mealMap)
  const percent = total > 0 ? Math.round((onPlanCount / total) * 100) : 0
  return { onPlanCount, total, percent }
}
