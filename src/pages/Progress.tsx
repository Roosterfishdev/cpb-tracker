import { useCallback, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { Scale, BarChart3, TrendingUp, Activity } from 'lucide-react'
import { db, upsertCheckin, ensureSeeded } from '../lib/db'
import { todayKey, getLastNDays } from '../lib/dates'
import {
  getDayNumber,
  getPhaseForDay,
  dayNumberToDateKey,
} from '../lib/phases'
import { isDayCompliant } from '../lib/compliance'
import { evaluateAchievements, getAchievementById } from '../lib/achievements'
import { useToastStore } from '../store/toastStore'
import { Card } from '../components/Card'
import { SectionHeader } from '../components/SectionHeader'
import { ComplianceBarChart } from '../components/ComplianceBarChart'
import { ExerciseDonutChart } from '../components/ExerciseDonutChart'
import { format } from 'date-fns'

function RatingSelector({
  label,
  value,
  onChange,
}: {
  label: string
  value?: number
  onChange: (v: 1 | 2 | 3 | 4 | 5) => void
}) {
  return (
    <div>
      <p className="mb-2.5 text-sm font-semibold text-foreground">{label}</p>
      <div className="flex gap-2">
        {([1, 2, 3, 4, 5] as const).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`min-h-[44px] flex-1 rounded-full text-sm font-bold transition-all ${
              value === n
                ? 'bg-accent text-foreground shadow-sm'
                : 'bg-surface-muted text-muted'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

export function ProgressPage() {
  const today = todayKey()
  const showToast = useToastStore((s) => s.show)

  useEffect(() => {
    if (window.location.hash === '#check-in') {
      document.getElementById('check-in')?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  const settings = useLiveQuery(async () => {
    await ensureSeeded()
    return db.settings.get(1)
  })

  const checkin = useLiveQuery(() => db.checkins.get(today), [today])

  const allCheckins = useLiveQuery(() => db.checkins.toArray())

  const weekKeys = getLastNDays(7)

  const runAchievements = useCallback(async () => {
    const earned = await evaluateAchievements()
    for (const id of earned) {
      const def = getAchievementById(id)
      if (def) showToast(`Achievement unlocked: ${def.title}`)
    }
  }, [showToast])

  const handleCheckinUpdate = useCallback(
    async (data: Parameters<typeof upsertCheckin>[1]) => {
      await upsertCheckin(today, data)
      await runAchievements()
    },
    [today, runAchievements],
  )

  const complianceBars = useLiveQuery(async () => {
    if (!settings) return []
    const bars = []
    for (const key of weekKeys) {
      const meals = await db.meals.where('date').equals(key).toArray()
      const mealMap = new Map(meals.map((m) => [m.slot, m]))
      const onPlanCount = settings.mealSlots.filter((slot) => {
        const m = mealMap.get(slot)
        return m?.eaten && m?.onPlan && !m?.skipped
      }).length
      bars.push({
        label: format(new Date(key + 'T12:00:00'), 'EEE'),
        count: onPlanCount,
        isToday: key === today,
      })
    }
    return bars
  }, [weekKeys.join(','), settings?.mealSlots.join(','), today])

  const weekSummary = useLiveQuery(async () => {
    if (!settings) return null
    const checkins = await db.checkins.where('date').anyOf(weekKeys).toArray()
    const energyVals = checkins.filter((c) => c.energy).map((c) => c.energy!)
    const cravingVals = checkins.filter((c) => c.cravings).map((c) => c.cravings!)

    let compliantDays = 0
    for (const key of weekKeys) {
      if (await isDayCompliant(key)) compliantDays++
    }

    const exercises = await db.exercise.where('date').anyOf(weekKeys).toArray()
    const exerciseDays = exercises.filter((e) => e.didExercise).length

    return {
      avgEnergy:
        energyVals.length > 0
          ? (energyVals.reduce((a, b) => a + b, 0) / energyVals.length).toFixed(1)
          : '—',
      avgCravings:
        cravingVals.length > 0
          ? (cravingVals.reduce((a, b) => a + b, 0) / cravingVals.length).toFixed(1)
          : '—',
      compliantDays,
      exerciseDays,
    }
  }, [weekKeys.join(','), settings?.startDate])

  const exerciseBreakdown = useLiveQuery(async () => {
    if (!settings) return []
    const dayNumber = getDayNumber(settings.startDate)
    const phase = getPhaseForDay(dayNumber)
    const dateKeys: string[] = []
    for (let d = phase.startDay; d <= Math.min(phase.endDay, dayNumber); d++) {
      dateKeys.push(dayNumberToDateKey(settings.startDate, d))
    }
    const exercises = await db.exercise.where('date').anyOf(dateKeys).toArray()
    const counts: Record<string, number> = {}
    for (const ex of exercises) {
      if (ex.didExercise && ex.type) {
        counts[ex.type] = (counts[ex.type] ?? 0) + 1
      }
    }
    return Object.entries(counts).map(([type, count]) => ({ type, count }))
  }, [settings?.startDate, today])

  if (!settings) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-5">
        <p className="text-sm font-medium text-muted">Loading…</p>
      </div>
    )
  }

  const weightData = (allCheckins ?? [])
    .filter((c) => c.weight != null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((c) => ({
      date: c.date.slice(5),
      weight: c.weight,
    }))

  const dayNumber = getDayNumber(settings.startDate)
  const phase = getPhaseForDay(dayNumber)
  const maxSlots = settings.mealSlots.length

  return (
    <div className="space-y-5 px-5 pb-6 pt-4">
      <header>
        <h1 className="text-2xl font-extrabold text-foreground">Progress</h1>
        <p className="mt-1 text-sm font-medium text-muted">
          Phase {phase.id} · {phase.label}
        </p>
      </header>

      <Card id="check-in">
        <SectionHeader
          icon={<Scale size={18} strokeWidth={2.25} />}
          title="Daily check-in"
          subtitle="Weight & wellbeing"
        />
        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">
              Weight ({settings.weightUnit})
            </label>
            <input
              type="number"
              step="0.1"
              value={checkin?.weight ?? ''}
              onChange={(e) =>
                handleCheckinUpdate({
                  weight: e.target.value ? Number(e.target.value) : undefined,
                  energy: checkin?.energy,
                  cravings: checkin?.cravings,
                  mood: checkin?.mood,
                })
              }
              className="w-full min-h-[48px] rounded-full bg-surface-muted px-4 text-sm font-medium text-foreground outline-none placeholder:text-muted"
              placeholder="Optional"
            />
          </div>
          <RatingSelector
            label="Energy"
            value={checkin?.energy}
            onChange={(energy) =>
              handleCheckinUpdate({
                weight: checkin?.weight,
                energy,
                cravings: checkin?.cravings,
                mood: checkin?.mood,
              })
            }
          />
          <RatingSelector
            label="Cravings"
            value={checkin?.cravings}
            onChange={(cravings) =>
              handleCheckinUpdate({
                weight: checkin?.weight,
                energy: checkin?.energy,
                cravings,
                mood: checkin?.mood,
              })
            }
          />
          <RatingSelector
            label="Mood"
            value={checkin?.mood}
            onChange={(mood) =>
              handleCheckinUpdate({
                weight: checkin?.weight,
                energy: checkin?.energy,
                cravings: checkin?.cravings,
                mood,
              })
            }
          />
        </div>
      </Card>

      <Card>
        <SectionHeader
          icon={<BarChart3 size={18} strokeWidth={2.25} />}
          title="Weekly compliance"
          subtitle="Meals on plan · last 7 days"
        />
        {complianceBars && (
          <ComplianceBarChart
            data={complianceBars}
            maxSlots={maxSlots}
            target={maxSlots}
          />
        )}
      </Card>

      <Card>
        <SectionHeader
          icon={<TrendingUp size={18} strokeWidth={2.25} />}
          title="Weight trend"
        />
        {weightData.length >= 2 ? (
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightData}>
                <CartesianGrid stroke="#EEF2E8" strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#8A8F88', fontSize: 11, fontWeight: 500 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#8A8F88', fontSize: 11, fontWeight: 500 }}
                  domain={['auto', 'auto']}
                  width={36}
                />
                <Tooltip
                  contentStyle={{
                    background: '#FFFFFF',
                    border: 'none',
                    borderRadius: 16,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                    fontWeight: 600,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#A3E635"
                  strokeWidth={3}
                  dot={{ fill: '#A3E635', r: 4, strokeWidth: 0 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-8 text-center text-sm font-medium text-muted">
            Log weight on at least 2 days to see your trend chart.
          </p>
        )}
      </Card>

      <Card>
        <SectionHeader
          icon={<Activity size={18} strokeWidth={2.25} />}
          title="Exercise breakdown"
          subtitle={`Phase ${phase.id} · by type`}
        />
        <ExerciseDonutChart data={exerciseBreakdown ?? []} />
      </Card>

      {weekSummary && (
        <Card>
          <SectionHeader
            icon={<BarChart3 size={18} strokeWidth={2.25} />}
            title="This week"
          />
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Avg energy" value={weekSummary.avgEnergy} />
            <Stat label="Avg cravings" value={weekSummary.avgCravings} />
            <Stat label="Compliant days" value={String(weekSummary.compliantDays)} />
            <Stat label="Exercise days" value={String(weekSummary.exerciseDays)} />
          </div>
        </Card>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface-muted px-4 py-3">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="text-xl font-extrabold text-foreground">{value}</p>
    </div>
  )
}
