import { useEffect, useCallback, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, upsertMeal, upsertExercise, upsertDayNotes, ensureSeeded } from '../lib/db'
import { todayKey, formatDisplayDate, getLastNDays } from '../lib/dates'
import {
  getDayNumber,
  getPhaseForDay,
  getAllowedFoods,
  getDaysRemainingInPhase,
} from '../lib/phases'
import { PhaseCard } from '../components/PhaseCard'
import { MealRow } from '../components/MealRow'
import { ExerciseCard } from '../components/ExerciseCard'
import { evaluateAchievements, getAchievementById } from '../lib/achievements'
import { useToastStore } from '../store/toastStore'

function useDebouncedSave(value: string, onSave: (v: string) => void, delay = 500) {
  useEffect(() => {
    const timer = setTimeout(() => onSave(value), delay)
    return () => clearTimeout(timer)
  }, [value, onSave, delay])
}

export function TodayPage() {
  const today = todayKey()
  const showToast = useToastStore((s) => s.show)

  const settings = useLiveQuery(async () => {
    await ensureSeeded()
    return db.settings.get(1)
  })

  const meals = useLiveQuery(
    () => db.meals.where('date').equals(today).toArray(),
    [today],
  )

  const dayRecord = useLiveQuery(
    () => db.days.get(today),
    [today],
  )

  const exercise = useLiveQuery(
    () => db.exercise.where('date').equals(today).first(),
    [today],
  )

  const weeklyExerciseCount = useLiveQuery(async () => {
    const keys = getLastNDays(7)
    const records = await db.exercise.where('date').anyOf(keys).toArray()
    return records.filter((r) => r.didExercise).length
  }, [today])

  const [notes, setNotes] = useState('')

  useEffect(() => {
    setNotes(dayRecord?.notes ?? '')
  }, [dayRecord?.notes, today])

  const runAchievements = useCallback(async () => {
    const earned = await evaluateAchievements()
    for (const id of earned) {
      const def = getAchievementById(id)
      if (def) showToast(`Achievement unlocked: ${def.title}`)
    }
  }, [showToast])

  const saveNotes = useCallback(
    async (v: string) => {
      await upsertDayNotes(today, v)
      await runAchievements()
    },
    [today, runAchievements],
  )

  useDebouncedSave(notes, saveNotes)

  const handleMealUpdate = useCallback(
    async (slot: string, updates: Parameters<typeof upsertMeal>[2]) => {
      await upsertMeal(today, slot, updates)
      await runAchievements()
    },
    [today, runAchievements],
  )

  const handleExerciseUpdate = useCallback(
    async (data: Parameters<typeof upsertExercise>[1]) => {
      await upsertExercise(today, data)
      await runAchievements()
    },
    [today, runAchievements],
  )

  if (!settings) {
    return <div className="p-4 text-muted">Loading…</div>
  }

  const dayNumber = getDayNumber(settings.startDate)
  const phase = getPhaseForDay(dayNumber)
  const allowedFoods = getAllowedFoods(dayNumber)
  const daysRemaining = getDaysRemainingInPhase(dayNumber)
  const progressPct = Math.min(100, (dayNumber / 90) * 100)

  const mealMap = new Map((meals ?? []).map((m) => [m.slot, m]))

  return (
    <div className="space-y-4 p-4">
      <header>
        <p className="text-sm text-muted">{formatDisplayDate(today)}</p>
        <h1 className="text-2xl font-bold text-foreground">
          Day {dayNumber} <span className="text-muted">/ 90</span>
        </h1>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-elevated">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </header>

      <PhaseCard
        phase={phase}
        daysRemaining={daysRemaining}
        allowedFoods={allowedFoods}
      />

      <section>
        <h2 className="mb-3 text-base font-semibold text-foreground">Meals</h2>
        <div className="space-y-2">
          {settings.mealSlots.map((slot) => (
            <MealRow
              key={slot}
              slot={slot}
              meal={mealMap.get(slot)}
              onUpdate={(updates) => handleMealUpdate(slot, updates)}
            />
          ))}
        </div>
      </section>

      <ExerciseCard
        exercise={exercise ?? undefined}
        weeklyCount={weeklyExerciseCount ?? 0}
        onUpdate={handleExerciseUpdate}
      />

      <section>
        <h2 className="mb-2 text-base font-semibold text-foreground">Notes</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="How did today go?"
          className="w-full resize-none rounded-xl border border-border bg-surface-elevated px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
        />
      </section>
    </div>
  )
}
