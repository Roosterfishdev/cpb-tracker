import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronUp, History, Pencil } from 'lucide-react'
import { db, getSettings } from '../lib/db'
import { formatDisplayDate } from '../lib/dates'
import { isDayCompliant, countOnPlanMeals } from '../lib/compliance'
import { Card } from './Card'
import { SectionHeader } from './SectionHeader'
import { PhotoThumbnail } from './MealPhotoUpload'
import { CheckinEditor } from './CheckinEditor'
import type { Checkin } from '../lib/db'
import type { MealSlot } from '../lib/mealSlots'
import { formatSlotLabel } from '../lib/mealSlots'

const RATING_COLORS = {
  energy: '#A3E635',
  cravings: '#F8B5B5',
  mood: '#9FC8EC',
} as const

interface CheckinHistoryProps {
  weightUnit: string
  today: string
}

export function CheckinHistory({ weightUnit, today }: CheckinHistoryProps) {
  const [expandedDate, setExpandedDate] = useState<string | null>(null)

  const checkins = useLiveQuery(async () => {
    const all = await db.checkins.toArray()
    return all
      .filter((c) => hasAnyCheckinField(c))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [today])

  if (!checkins?.length) {
    return (
      <Card>
        <SectionHeader
          icon={<History size={18} strokeWidth={2.25} />}
          title="History log"
          subtitle="Past check-ins appear here"
        />
        <p className="py-4 text-center text-sm font-medium text-muted">
          No check-ins saved yet.
        </p>
      </Card>
    )
  }

  return (
    <Card>
      <SectionHeader
        icon={<History size={18} strokeWidth={2.25} />}
        title="History log"
        subtitle={`${checkins.length} saved · tap to expand & edit`}
      />
      <div className="space-y-2">
        {checkins.map((c) => (
          <HistoryRow
            key={c.date}
            checkin={c}
            weightUnit={weightUnit}
            expanded={expandedDate === c.date}
            onToggle={() =>
              setExpandedDate(expandedDate === c.date ? null : c.date)
            }
          />
        ))}
      </div>
    </Card>
  )
}

function hasAnyCheckinField(c: Checkin): boolean {
  return c.weight != null || c.energy != null || c.cravings != null || c.mood != null
}

function HistoryRow({
  checkin,
  weightUnit,
  expanded,
  onToggle,
}: {
  checkin: Checkin
  weightUnit: string
  expanded: boolean
  onToggle: () => void
}) {
  const navigate = useNavigate()

  return (
    <div className="overflow-hidden rounded-2xl bg-surface-muted/60">
      <div className="flex items-center gap-2 px-2 py-2">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-3 px-2 py-1 text-left"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground">
              {formatDisplayDate(checkin.date)}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {checkin.weight != null && (
                <span className="text-xs font-semibold text-muted">
                  {checkin.weight} {weightUnit}
                </span>
              )}
              <RatingDots label="E" value={checkin.energy} color={RATING_COLORS.energy} />
              <RatingDots label="C" value={checkin.cravings} color={RATING_COLORS.cravings} />
              <RatingDots label="M" value={checkin.mood} color={RATING_COLORS.mood} />
            </div>
          </div>
          {expanded ? (
            <ChevronUp size={18} className="shrink-0 text-muted" />
          ) : (
            <ChevronDown size={18} className="shrink-0 text-muted" />
          )}
        </button>
        <button
          type="button"
          onClick={() => navigate(`/?date=${checkin.date}`)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-muted shadow-sm"
          aria-label="Edit day log"
        >
          <Pencil size={15} />
        </button>
      </div>
      {expanded && (
        <DayDetail date={checkin.date} checkin={checkin} weightUnit={weightUnit} />
      )}
    </div>
  )
}

function RatingDots({
  label,
  value,
  color,
}: {
  label: string
  value?: number
  color: string
}) {
  if (value == null) return null
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold text-foreground"
      style={{ backgroundColor: `${color}44` }}
    >
      {label}
      {value}
    </span>
  )
}

function DayDetail({
  date,
  checkin,
  weightUnit,
}: {
  date: string
  checkin: Checkin
  weightUnit: string
}) {
  const navigate = useNavigate()

  const detail = useLiveQuery(async () => {
    const settings = await getSettings()
    const meals = await db.meals.where('date').equals(date).toArray()
    const exercise = await db.exercise.where('date').equals(date).first()
    const photos = await db.mealPhotos.where('date').equals(date).toArray()
    const mealMap = new Map(meals.map((m) => [m.slot, m]))
    const compliant = await isDayCompliant(date)
    const onPlan = countOnPlanMeals(settings.mealSlots, mealMap)

    return {
      settings,
      exercise,
      photos,
      mealMap,
      compliant,
      onPlan,
      totalSlots: settings.mealSlots.length,
    }
  }, [date, checkin.weight, checkin.energy, checkin.cravings, checkin.mood])

  if (!detail) return null

  const { settings, exercise, photos, mealMap, compliant, onPlan, totalSlots } = detail

  return (
    <div className="space-y-3 border-t border-white/60 px-4 pb-4 pt-3">
      <div>
        <p className="mb-2 text-xs font-bold text-foreground">Edit check-in</p>
        <CheckinEditor date={date} weightUnit={weightUnit} compact />
      </div>

      <div className="rounded-xl bg-white/70 px-3 py-2">
        <p className="text-xs font-bold text-foreground">
          Meals: {onPlan}/{totalSlots} on plan
        </p>
        <p className="text-xs font-medium text-muted">
          {compliant ? 'Day compliant' : 'Not fully compliant'}
        </p>
        <ul className="mt-2 space-y-1">
          {settings.mealSlots.map((slot: MealSlot) => {
            const m = mealMap.get(slot.id)
            let status = 'Not logged'
            if (m?.skipped) status = 'Skipped'
            else if (m?.eaten && m?.onPlan) status = 'On plan'
            else if (m?.eaten) status = 'Eaten'
            return (
              <li key={slot.id} className="text-[11px] text-muted">
                {formatSlotLabel(slot)} — {status}
              </li>
            )
          })}
        </ul>
      </div>

      {exercise?.didExercise && (
        <div className="rounded-xl bg-white/70 px-3 py-2">
          <p className="text-xs font-bold text-foreground">Exercise</p>
          <p className="text-xs font-medium text-muted capitalize">
            {exercise.type ?? 'Logged'}
            {exercise.minutes ? ` · ${exercise.minutes} min` : ''}
          </p>
        </div>
      )}

      {photos.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-bold text-foreground">Meal photos</p>
          <div className="flex flex-wrap gap-3">
            {photos.map((p) => {
              const slot = settings.mealSlots.find((s) => s.id === p.slotId)
              return (
                <PhotoThumbnail
                  key={p.id}
                  blob={p.blob}
                  label={slot?.name ?? 'Meal'}
                />
              )
            })}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => navigate(`/?date=${date}`)}
        className="w-full min-h-[44px] rounded-full bg-accent text-sm font-bold text-foreground shadow-sm"
      >
        Edit meals & exercise
      </button>
    </div>
  )
}
