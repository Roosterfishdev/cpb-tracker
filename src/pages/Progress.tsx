import { useCallback } from 'react'
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
import { db, upsertCheckin, ensureSeeded } from '../lib/db'
import { todayKey, getLastNDays, formatDisplayDate } from '../lib/dates'
import {
  getDayNumber,
  getPhaseForDay,
  dayNumberToDateKey,
} from '../lib/phases'
import { getDayStatus, isDayCompliant } from '../lib/compliance'
import { evaluateAchievements, getAchievementById } from '../lib/achievements'
import { useToastStore } from '../store/toastStore'

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
      <p className="mb-2 text-sm text-muted">{label}</p>
      <div className="flex gap-2">
        {([1, 2, 3, 4, 5] as const).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`min-h-[44px] flex-1 rounded-lg border text-sm font-medium ${
              value === n
                ? 'border-accent bg-accent/15 text-accent'
                : 'border-border bg-surface-elevated text-muted'
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

  const phaseGrid = useLiveQuery(async () => {
    if (!settings) return []
    const dayNumber = getDayNumber(settings.startDate)
    const phase = getPhaseForDay(dayNumber)
    const days: { dayNum: number; dateKey: string; status: Awaited<ReturnType<typeof getDayStatus>> }[] = []

    for (let d = phase.startDay; d <= Math.min(phase.endDay, dayNumber); d++) {
      const dateKey = dayNumberToDateKey(settings.startDate, d)
      const status = await getDayStatus(dateKey)
      days.push({ dayNum: d, dateKey, status })
    }
    return days
  }, [settings?.startDate, today])

  if (!settings) {
    return <div className="p-4 text-muted">Loading…</div>
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

  return (
    <div className="space-y-4 p-4">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Progress</h1>
        <p className="text-sm text-muted">Phase {phase.id} · {phase.label}</p>
      </header>

      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="mb-4 text-base font-semibold text-foreground">Daily check-in</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-muted">
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
              className="w-full min-h-[44px] rounded-xl border border-border bg-surface-elevated px-3 text-sm text-foreground"
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
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="mb-4 text-base font-semibold text-foreground">Weight trend</h2>
        {weightData.length >= 2 ? (
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightData}>
                <CartesianGrid stroke="#2a2a2a" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: '#a3a3a3', fontSize: 11 }} />
                <YAxis
                  tick={{ fill: '#a3a3a3', fontSize: 11 }}
                  domain={['auto', 'auto']}
                  width={36}
                />
                <Tooltip
                  contentStyle={{
                    background: '#1c1c1c',
                    border: '1px solid #2a2a2a',
                    borderRadius: 8,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#FACC15"
                  strokeWidth={2}
                  dot={{ fill: '#FACC15', r: 3 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted">
            Log weight on at least 2 days to see your trend chart.
          </p>
        )}
      </section>

      {weekSummary && (
        <section className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="mb-3 text-base font-semibold text-foreground">This week</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Stat label="Avg energy" value={weekSummary.avgEnergy} />
            <Stat label="Avg cravings" value={weekSummary.avgCravings} />
            <Stat label="Compliant days" value={String(weekSummary.compliantDays)} />
            <Stat label="Exercise days" value={String(weekSummary.exerciseDays)} />
          </div>
        </section>
      )}

      {phaseGrid && phaseGrid.length > 0 && (
        <section className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="mb-3 text-base font-semibold text-foreground">
            Phase {phase.id} compliance
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {phaseGrid.map(({ dayNum, dateKey, status }) => (
              <div
                key={dateKey}
                title={`Day ${dayNum} · ${formatDisplayDate(dateKey)}`}
                className={`h-8 w-8 rounded-md text-center text-xs leading-8 ${
                  status === 'compliant'
                    ? 'bg-accent text-background font-medium'
                    : status === 'logged'
                      ? 'bg-muted/30 text-muted'
                      : 'bg-surface-elevated text-muted/40'
                }`}
              >
                {dayNum}
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-4 text-xs text-muted">
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded bg-accent" /> Compliant
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded bg-muted/30" /> Logged
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded bg-surface-elevated" /> Missed
            </span>
          </div>
        </section>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-elevated px-3 py-2">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-lg font-semibold text-foreground">{value}</p>
    </div>
  )
}
