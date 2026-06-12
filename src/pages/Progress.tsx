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
import { db, ensureSeeded } from '../lib/db'
import { todayKey, getLastNDays } from '../lib/dates'
import {
  getDayNumber,
  getPhaseForDay,
  dayNumberToDateKey,
} from '../lib/phases'
import { isDayCompliant, countOnPlanMeals } from '../lib/compliance'
import { evaluateAchievements, getAchievementById } from '../lib/achievements'
import { useToastStore } from '../store/toastStore'
import { Card } from '../components/Card'
import { SectionHeader } from '../components/SectionHeader'
import { ComplianceBarChart } from '../components/ComplianceBarChart'
import { ExerciseDonutChart } from '../components/ExerciseDonutChart'
import { CheckinHistory } from '../components/CheckinHistory'
import { CheckinEditor } from '../components/CheckinEditor'
import { format } from 'date-fns'

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

  const allCheckins = useLiveQuery(() => db.checkins.toArray())

  const weekKeys = getLastNDays(7)

  const runAchievements = useCallback(async () => {
    const earned = await evaluateAchievements()
    for (const id of earned) {
      const def = getAchievementById(id)
      if (def) showToast(`Achievement unlocked: ${def.title}`)
    }
  }, [showToast])

  const complianceBars = useLiveQuery(async () => {
    if (!settings) return []
    const bars = []
    for (const key of weekKeys) {
      const meals = await db.meals.where('date').equals(key).toArray()
      const mealMap = new Map(meals.map((m) => [m.slot, m]))
      const onPlanCount = countOnPlanMeals(settings.mealSlots, mealMap)
      bars.push({
        label: format(new Date(key + 'T12:00:00'), 'EEE'),
        count: onPlanCount,
        isToday: key === today,
      })
    }
    return bars
  }, [weekKeys.join(','), settings?.mealSlots.map((s) => s.id).join(','), today])

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

      <Card id="check-in">
        <SectionHeader
          icon={<Scale size={18} strokeWidth={2.25} />}
          title="Daily check-in"
          subtitle="Weight & wellbeing · today"
        />
        <CheckinEditor
          date={today}
          weightUnit={settings.weightUnit}
          onSaved={runAchievements}
        />
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

      <CheckinHistory weightUnit={settings.weightUnit} today={today} />
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
