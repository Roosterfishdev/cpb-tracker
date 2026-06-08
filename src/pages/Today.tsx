import { useEffect, useCallback, useState, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Pencil, MoreHorizontal } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { db, upsertMeal, upsertExercise, upsertDayNotes, ensureSeeded } from '../lib/db'
import { todayKey, getLastNDays } from '../lib/dates'
import {
  getDayNumber,
  getPhaseForDay,
  getAllowedFoods,
  getDaysRemainingInPhase,
} from '../lib/phases'
import { PhaseCard } from '../components/PhaseCard'
import { MealsCard } from '../components/MealRow'
import { ExerciseCard } from '../components/ExerciseCard'
import { CircularGauge } from '../components/CircularGauge'
import { Card } from '../components/Card'
import { evaluateAchievements, getAchievementById } from '../lib/achievements'
import { useToastStore } from '../store/toastStore'
import { format } from 'date-fns'

function useDebouncedSave(value: string, onSave: (v: string) => void, delay = 500) {
  useEffect(() => {
    const timer = setTimeout(() => onSave(value), delay)
    return () => clearTimeout(timer)
  }, [value, onSave, delay])
}

function computeMealCompliance(
  mealSlots: string[],
  mealMap: Map<string, { eaten?: boolean; onPlan?: boolean; skipped?: boolean } | undefined>,
) {
  const total = mealSlots.length
  const onPlanCount = mealSlots.filter((slot) => {
    const m = mealMap.get(slot)
    return m?.eaten && m?.onPlan && !m?.skipped
  }).length
  const percent = total > 0 ? Math.round((onPlanCount / total) * 100) : 0
  return { onPlanCount, total, percent }
}

export function TodayPage() {
  const today = todayKey()
  const showToast = useToastStore((s) => s.show)
  const navigate = useNavigate()
  const notesRef = useRef<HTMLTextAreaElement>(null)

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
  const [showNotes, setShowNotes] = useState(false)

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

  const focusNotes = () => {
    setShowNotes(true)
    setTimeout(() => notesRef.current?.focus(), 50)
  }

  if (!settings) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-5">
        <p className="text-sm font-medium text-muted">Loading…</p>
      </div>
    )
  }

  const dayNumber = getDayNumber(settings.startDate)
  const phase = getPhaseForDay(dayNumber)
  const allowedFoods = getAllowedFoods(dayNumber)
  const daysRemaining = getDaysRemainingInPhase(dayNumber)

  const mealMap = new Map((meals ?? []).map((m) => [m.slot, m]))
  const { onPlanCount, total, percent } = computeMealCompliance(
    settings.mealSlots,
    mealMap,
  )

  const datePill = format(new Date(), 'MMM d')

  return (
    <div className="space-y-5 px-5 pb-6 pt-4">
      {/* Top bar */}
      <header className="relative flex items-center justify-between">
        <span className="rounded-full bg-surface px-3.5 py-1.5 text-xs font-bold text-foreground shadow-card">
          Today · {datePill}
        </span>
        <h1 className="absolute left-1/2 -translate-x-1/2 text-base font-extrabold text-foreground">
          CPB Tracker
        </h1>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={focusNotes}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-muted shadow-card"
            aria-label="Edit notes"
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-muted shadow-card"
            aria-label="Settings"
          >
            <MoreHorizontal size={16} />
          </button>
        </div>
      </header>

      {/* Hero compliance gauge */}
      <div className="hero-gradient rounded-card px-5 py-6 shadow-card">
        <div className="flex flex-col items-center">
          <CircularGauge percent={percent} size={168} strokeWidth={14}>
            <span className="text-4xl font-extrabold text-white">{percent}%</span>
            <span className="mt-0.5 text-sm font-semibold text-white/90">
              {onPlanCount} of {total} on plan
            </span>
          </CircularGauge>
          <p className="mt-4 text-center text-sm font-semibold text-white/95">
            Day {dayNumber} · Phase {phase.id} · {phase.label}
          </p>
        </div>
      </div>

      <PhaseCard
        phase={phase}
        daysRemaining={daysRemaining}
        allowedFoods={allowedFoods}
      />

      <MealsCard
        mealSlots={settings.mealSlots}
        meals={mealMap}
        onUpdate={handleMealUpdate}
      />

      <ExerciseCard
        exercise={exercise ?? undefined}
        weeklyCount={weeklyExerciseCount ?? 0}
        onUpdate={handleExerciseUpdate}
      />

      {(showNotes || notes) && (
        <Card>
          <h2 className="mb-3 text-base font-bold text-foreground">Notes</h2>
          <textarea
            ref={notesRef}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="How did today go?"
            className="w-full resize-none rounded-2xl bg-surface-muted px-4 py-3 text-sm font-medium text-foreground outline-none placeholder:text-muted"
          />
        </Card>
      )}
    </div>
  )
}
