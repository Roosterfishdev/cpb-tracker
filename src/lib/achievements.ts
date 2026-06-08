import { db, getSettings } from './db'
import { getComplianceStreak, getPerfectStreak } from './compliance'
import { getDayNumber, getPhaseForDay } from './phases'
import { todayKey } from './dates'

export interface AchievementContext {
  dayNumber: number
  currentPhaseId: number
  getComplianceStreak: () => Promise<number>
  getPerfectStreak: () => Promise<number>
  getTotalLoggedDays: () => Promise<number>
  getTotalExerciseDays: () => Promise<number>
  getPadelDays: () => Promise<number>
  getWeighInCount: () => Promise<number>
  hasAnyMealLog: () => Promise<boolean>
}

export interface AchievementDefinition {
  id: string
  title: string
  description: string
  icon: string
  check: (ctx: AchievementContext) => Promise<boolean>
}

async function buildContext(): Promise<AchievementContext> {
  const settings = await getSettings()
  const today = todayKey()
  const dayNumber = getDayNumber(settings.startDate)

  return {
    dayNumber,
    currentPhaseId: getPhaseForDay(dayNumber).id,
    getComplianceStreak: () => getComplianceStreak(today),
    getPerfectStreak: () => getPerfectStreak(today),
    getTotalLoggedDays: async () => {
      const allDates = new Set<string>()
      const meals = await db.meals.toArray()
      meals.forEach((m) => {
        if (m.eaten || m.skipped) allDates.add(m.date)
      })
      return allDates.size
    },
    getTotalExerciseDays: async () => {
      const exercises = await db.exercise.toArray()
      return exercises.filter((e) => e.didExercise).length
    },
    getPadelDays: async () => {
      const exercises = await db.exercise.toArray()
      return exercises.filter((e) => e.didExercise && e.type === 'padel').length
    },
    getWeighInCount: async () => {
      const checkins = await db.checkins.toArray()
      return checkins.filter((c) => c.weight != null).length
    },
    hasAnyMealLog: async () => {
      const count = await db.meals.count()
      return count > 0
    },
  }
}

function phaseReached(dayNumber: number, phaseStartDay: number): boolean {
  return dayNumber >= phaseStartDay
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    id: 'first_log',
    title: 'Day One',
    description: 'Logged your first day',
    icon: '🌱',
    check: async (ctx) => {
      const logged = await ctx.getTotalLoggedDays()
      return logged >= 1 || (await ctx.hasAnyMealLog())
    },
  },
  {
    id: 'streak_3',
    title: 'Getting Going',
    description: '3-day compliance streak',
    icon: '🔥',
    check: async (ctx) => (await ctx.getComplianceStreak()) >= 3,
  },
  {
    id: 'streak_7',
    title: 'One Week Strong',
    description: '7-day compliance streak',
    icon: '💪',
    check: async (ctx) => (await ctx.getComplianceStreak()) >= 7,
  },
  {
    id: 'streak_14',
    title: 'Two Weeks In',
    description: '14-day compliance streak',
    icon: '⭐',
    check: async (ctx) => (await ctx.getComplianceStreak()) >= 14,
  },
  {
    id: 'phase1_done',
    title: 'Reset Complete',
    description: 'Reached day 29 — survived strict phase 1',
    icon: '🏁',
    check: async (ctx) => phaseReached(ctx.dayNumber, 29),
  },
  {
    id: 'phase_2',
    title: 'New Foods Unlocked',
    description: 'Entered Phase 2 — Veg & Fruit',
    icon: '🥬',
    check: async (ctx) => phaseReached(ctx.dayNumber, 29),
  },
  {
    id: 'phase_3',
    title: 'New Foods Unlocked',
    description: 'Entered Phase 3 — Fish & Protein',
    icon: '🐟',
    check: async (ctx) => phaseReached(ctx.dayNumber, 36),
  },
  {
    id: 'phase_4',
    title: 'New Foods Unlocked',
    description: 'Entered Phase 4 — Fats & Calcium',
    icon: '🥑',
    check: async (ctx) => phaseReached(ctx.dayNumber, 43),
  },
  {
    id: 'phase_5',
    title: 'New Foods Unlocked',
    description: 'Entered Phase 5 — Carb Variety',
    icon: '🌾',
    check: async (ctx) => phaseReached(ctx.dayNumber, 50),
  },
  {
    id: 'phase_6',
    title: 'New Foods Unlocked',
    description: 'Entered Phase 6 — Integration',
    icon: '🎉',
    check: async (ctx) => phaseReached(ctx.dayNumber, 57),
  },
  {
    id: 'move_10',
    title: 'Mover',
    description: 'Logged exercise on 10 days',
    icon: '🏃',
    check: async (ctx) => (await ctx.getTotalExerciseDays()) >= 10,
  },
  {
    id: 'padel_5',
    title: 'Padel Regular',
    description: '5 exercise days with Padel',
    icon: '🎾',
    check: async (ctx) => (await ctx.getPadelDays()) >= 5,
  },
  {
    id: 'weigh_7',
    title: 'Tracking the Trend',
    description: 'Recorded weight on 7 days',
    icon: '⚖️',
    check: async (ctx) => (await ctx.getWeighInCount()) >= 7,
  },
  {
    id: 'perfect_week',
    title: 'Flawless Seven',
    description: '7 consecutive fully-compliant days (no skips)',
    icon: '✨',
    check: async (ctx) => (await ctx.getPerfectStreak()) >= 7,
  },
  {
    id: 'halfway',
    title: 'Halfway There',
    description: 'Reached day 45',
    icon: '🎯',
    check: async (ctx) => phaseReached(ctx.dayNumber, 45),
  },
  {
    id: 'finished',
    title: '90 Days Done',
    description: 'Completed the full 90-day journey',
    icon: '🏆',
    check: async (ctx) => phaseReached(ctx.dayNumber, 90),
  },
]

export async function evaluateAchievements(): Promise<string[]> {
  const ctx = await buildContext()
  const newlyEarned: string[] = []
  const today = todayKey()

  for (const def of ACHIEVEMENT_DEFINITIONS) {
    const existing = await db.achievements.get(def.id)
    if (existing?.earnedAt) continue

    const earned = await def.check(ctx)
    if (earned) {
      await db.achievements.put({ id: def.id, earnedAt: today })
      newlyEarned.push(def.id)
    }
  }

  return newlyEarned
}

export function getAchievementById(id: string): AchievementDefinition | undefined {
  return ACHIEVEMENT_DEFINITIONS.find((a) => a.id === id)
}
