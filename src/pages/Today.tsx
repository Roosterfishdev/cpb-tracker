import { useEffect, useCallback, useState, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Pencil, MoreHorizontal, ChevronLeft, ChevronRight, Calendar, Scale } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { db, upsertMeal, upsertExercise, upsertDayNotes, ensureSeeded } from '../lib/db'
import {
  todayKey,
  getLastNDays,
  keyToDate,
  shiftDateKey,
  clampToToday,
  formatShortDate,
  isTodayKey,
  isValidDateKey,
} from '../lib/dates'
import {
  getDayNumber,
  getPhaseForDay,
  getAllowedFoods,
  getDaysRemainingInPhase,
} from '../lib/phases'
import { getMealComplianceSummary } from '../lib/compliance'
import { PhaseCard } from '../components/PhaseCard'
import { MealsCard } from '../components/MealRow'
import { ExerciseCard } from '../components/ExerciseCard'
import { CircularGauge } from '../components/CircularGauge'
import { Card } from '../components/Card'
import { SectionHeader } from '../components/SectionHeader'
import { CheckinEditor } from '../components/CheckinEditor'
import { evaluateAchievements, getAchievementById } from '../lib/achievements'
import { useToastStore } from '../store/toastStore'

function useDebouncedSave(value: string, onSave: (v: string) => void, delay = 500) {
  useEffect(() => {
    const timer = setTimeout(() => onSave(value), delay)
    return () => clearTimeout(timer)
  }, [value, onSave, delay])
}

export function TodayPage() {
  const calendarToday = todayKey()
  const [searchParams, setSearchParams] = useSearchParams()
  const dateParam = searchParams.get('date')
  const selectedDate = clampToToday(
    dateParam && isValidDateKey(dateParam) ? dateParam : calendarToday,
  )
  const viewingToday = isTodayKey(selectedDate)

  const showToast = useToastStore((s) => s.show)
  const navigate = useNavigate()
  const notesRef = useRef<HTMLTextAreaElement>(null)
  const dateInputRef = useRef<HTMLInputElement>(null)

  const setSelectedDate = (key: string) => {
    const clamped = clampToToday(key)
    if (isTodayKey(clamped)) {
      setSearchParams({})
    } else {
      setSearchParams({ date: clamped })
    }
  }

  const settings = useLiveQuery(async () => {
    await ensureSeeded()
    return db.settings.get(1)
  })

  const meals = useLiveQuery(
    () => db.meals.where('date').equals(selectedDate).toArray(),
    [selectedDate],
  )

  const dayRecord = useLiveQuery(
    () => db.days.get(selectedDate),
    [selectedDate],
  )

  const exercise = useLiveQuery(
    () => db.exercise.where('date').equals(selectedDate).first(),
    [selectedDate],
  )

  const weeklyExerciseCount = useLiveQuery(async () => {
    const keys = getLastNDays(7)
    const records = await db.exercise.where('date').anyOf(keys).toArray()
    return records.filter((r) => r.didExercise).length
  }, [calendarToday])

  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)

  useEffect(() => {
    setNotes(dayRecord?.notes ?? '')
    setShowNotes(!!dayRecord?.notes)
  }, [dayRecord?.notes, selectedDate])

  const runAchievements = useCallback(async () => {
    const earned = await evaluateAchievements()
    for (const id of earned) {
      const def = getAchievementById(id)
      if (def) showToast(`Achievement unlocked: ${def.title}`)
    }
  }, [showToast])

  const saveNotes = useCallback(
    async (v: string) => {
      await upsertDayNotes(selectedDate, v)
      await runAchievements()
    },
    [selectedDate, runAchievements],
  )

  useDebouncedSave(notes, saveNotes)

  const handleMealUpdate = useCallback(
    async (slotId: string, updates: Parameters<typeof upsertMeal>[2]) => {
      await upsertMeal(selectedDate, slotId, updates)
      await runAchievements()
    },
    [selectedDate, runAchievements],
  )

  const handleExerciseUpdate = useCallback(
    async (data: Parameters<typeof upsertExercise>[1]) => {
      await upsertExercise(selectedDate, data)
      await runAchievements()
    },
    [selectedDate, runAchievements],
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

  const selectedAsDate = keyToDate(selectedDate)
  const dayNumber = getDayNumber(settings.startDate, selectedAsDate)
  const phase = getPhaseForDay(dayNumber)
  const allowedFoods = getAllowedFoods(dayNumber)
  const daysRemaining = getDaysRemainingInPhase(dayNumber)

  const mealMap = new Map((meals ?? []).map((m) => [m.slot, m]))
  const { onPlanCount, total, percent } = getMealComplianceSummary(
    settings.mealSlots,
    mealMap,
  )

  const canGoForward = !viewingToday

  return (
    <div className="space-y-5 px-5 pb-6 pt-4">
      {!viewingToday && (
        <div className="flex items-center justify-between rounded-2xl bg-pastel-amber/40 px-4 py-2.5">
          <p className="text-sm font-semibold text-foreground">
            Editing {formatShortDate(selectedDate)}
          </p>
          <button
            type="button"
            onClick={() => setSearchParams({})}
            className="rounded-full bg-surface px-3 py-1 text-xs font-bold text-foreground shadow-sm"
          >
            Back to today
          </button>
        </div>
      )}

      <header className="relative flex items-center justify-between">
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setSelectedDate(shiftDateKey(selectedDate, -1))}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-muted shadow-card"
            aria-label="Previous day"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => dateInputRef.current?.showPicker?.() ?? dateInputRef.current?.click()}
            className="rounded-full bg-surface px-3 py-1.5 text-xs font-bold text-foreground shadow-card"
          >
            {viewingToday ? `Today · ${formatShortDate(selectedDate)}` : formatShortDate(selectedDate)}
          </button>
          <input
            ref={dateInputRef}
            type="date"
            value={selectedDate}
            max={calendarToday}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="sr-only"
            aria-label="Pick date"
          />
          <button
            type="button"
            disabled={!canGoForward}
            onClick={() => setSelectedDate(shiftDateKey(selectedDate, 1))}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-muted shadow-card disabled:opacity-30"
            aria-label="Next day"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <h1 className="absolute left-1/2 -translate-x-1/2 text-base font-extrabold text-foreground">
          CPB Tracker
        </h1>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => dateInputRef.current?.showPicker?.() ?? dateInputRef.current?.click()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-muted shadow-card"
            aria-label="Pick date"
          >
            <Calendar size={16} />
          </button>
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
        date={selectedDate}
        mealSlots={settings.mealSlots}
        meals={mealMap}
        onUpdate={handleMealUpdate}
      />

      <ExerciseCard
        exercise={exercise ?? undefined}
        weeklyCount={weeklyExerciseCount ?? 0}
        onUpdate={handleExerciseUpdate}
      />

      {!viewingToday && (
        <Card>
          <SectionHeader
            icon={<Scale size={18} strokeWidth={2.25} />}
            title="Check-in"
            subtitle="Weight & wellbeing for this day"
          />
          <CheckinEditor
            date={selectedDate}
            weightUnit={settings.weightUnit}
            startInEditMode
            onSaved={runAchievements}
          />
        </Card>
      )}

      {(showNotes || notes || !viewingToday) && (
        <Card>
          <h2 className="mb-3 text-base font-bold text-foreground">Notes</h2>
          <textarea
            ref={notesRef}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="How did this day go?"
            className="w-full resize-none rounded-2xl bg-surface-muted px-4 py-3 text-sm font-medium text-foreground outline-none placeholder:text-muted"
          />
        </Card>
      )}
    </div>
  )
}
