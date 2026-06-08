import { UtensilsCrossed } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Meal, MealPhoto } from '../lib/db'
import { db } from '../lib/db'
import { compressImage } from '../lib/imageCompress'
import { upsertMealPhoto, deleteMealPhoto } from '../lib/db'
import type { MealSlot } from '../lib/mealSlots'
import { formatSlotLabel, sortMealSlots } from '../lib/mealSlots'
import { Card } from './Card'
import { SectionHeader } from './SectionHeader'
import { MealPhotoUpload } from './MealPhotoUpload'

interface MealRowProps {
  slot: MealSlot
  meal?: Meal
  photo?: MealPhoto
  date: string
  onUpdate: (updates: Partial<Meal>) => void
  onPhotoChange?: () => void
}

interface MealsCardProps {
  date: string
  mealSlots: MealSlot[]
  meals: Map<string, Meal | undefined>
  onUpdate: (slotId: string, updates: Partial<Meal>) => void
}

export function MealsCard({ date, mealSlots, meals, onUpdate }: MealsCardProps) {
  const photos = useLiveQuery(
    () => db.mealPhotos.where('date').equals(date).toArray(),
    [date],
  )

  const photoMap = new Map((photos ?? []).map((p) => [p.slotId, p]))
  const sorted = sortMealSlots(mealSlots)

  return (
    <Card>
      <SectionHeader
        icon={<UtensilsCrossed size={18} strokeWidth={2.25} />}
        title="Meals"
        subtitle="Track eaten & on-plan"
      />
      <div className="space-y-3">
        {sorted.map((slot) => (
          <MealRow
            key={slot.id}
            slot={slot}
            date={date}
            meal={meals.get(slot.id)}
            photo={photoMap.get(slot.id)}
            onUpdate={(updates) => onUpdate(slot.id, updates)}
          />
        ))}
      </div>
    </Card>
  )
}

export function MealRow({ slot, meal, photo, date, onUpdate }: MealRowProps) {
  const eaten = meal?.eaten ?? false
  const onPlan = meal?.onPlan ?? false
  const skipped = meal?.skipped ?? false

  const progressPct = skipped ? 100 : eaten && onPlan ? 100 : eaten ? 50 : 0

  const handleUpload = async (file: File) => {
    const blob = await compressImage(file)
    await upsertMealPhoto(date, slot.id, blob)
  }

  const handleDeletePhoto = async () => {
    if (photo?.id) await deleteMealPhoto(photo.id)
  }

  if (skipped) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-surface-muted/60 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-muted line-through">
            {formatSlotLabel(slot)}
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/80">
            <div className="h-full w-full rounded-full bg-muted/40" />
          </div>
        </div>
        <button
          type="button"
          onClick={() => onUpdate({ skipped: false, eaten: false, onPlan: false })}
          className="shrink-0 text-xs font-semibold text-accent-deep"
        >
          Undo
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-surface-muted/60 px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-foreground">{formatSlotLabel(slot)}</span>
        <button
          type="button"
          onClick={() => onUpdate({ skipped: true, eaten: false, onPlan: false })}
          className="text-xs font-medium text-muted"
        >
          Skip
        </button>
      </div>
      <div className="mb-2.5 h-1.5 overflow-hidden rounded-full bg-white/80">
        <div
          className="h-full rounded-full bg-accent transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <div className="flex gap-2">
        <TogglePill
          label="Eaten"
          active={eaten}
          onClick={() => {
            const nextEaten = !eaten
            onUpdate({ eaten: nextEaten, onPlan: nextEaten ? onPlan : false })
          }}
        />
        <TogglePill
          label="On plan"
          active={onPlan}
          disabled={!eaten}
          onClick={() => onUpdate({ onPlan: !onPlan })}
        />
      </div>
      <MealPhotoUpload
        photo={photo}
        onUpload={handleUpload}
        onDelete={handleDeletePhoto}
      />
    </div>
  )
}

function TogglePill({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string
  active: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`min-h-[36px] flex-1 rounded-full text-xs font-semibold transition-all ${
        active ? 'bg-accent text-foreground shadow-sm' : 'bg-white text-muted'
      } ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
    >
      {label}
    </button>
  )
}
