import { UtensilsCrossed } from 'lucide-react'
import type { Meal } from '../lib/db'
import { Card } from './Card'
import { SectionHeader } from './SectionHeader'

interface MealRowProps {
  slot: string
  meal?: Meal
  onUpdate: (updates: Partial<Meal>) => void
}

interface MealsCardProps {
  mealSlots: string[]
  meals: Map<string, Meal | undefined>
  onUpdate: (slot: string, updates: Partial<Meal>) => void
}

export function MealsCard({ mealSlots, meals, onUpdate }: MealsCardProps) {
  return (
    <Card>
      <SectionHeader
        icon={<UtensilsCrossed size={18} strokeWidth={2.25} />}
        title="Meals"
        subtitle="Track eaten & on-plan"
      />
      <div className="space-y-3">
        {mealSlots.map((slot) => (
          <MealRow
            key={slot}
            slot={slot}
            meal={meals.get(slot)}
            onUpdate={(updates) => onUpdate(slot, updates)}
          />
        ))}
      </div>
    </Card>
  )
}

export function MealRow({ slot, meal, onUpdate }: MealRowProps) {
  const eaten = meal?.eaten ?? false
  const onPlan = meal?.onPlan ?? false
  const skipped = meal?.skipped ?? false

  const progressPct = skipped ? 100 : eaten && onPlan ? 100 : eaten ? 50 : 0

  if (skipped) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-surface-muted/60 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-muted line-through">{slot}</p>
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
        <span className="text-sm font-bold text-foreground">{slot}</span>
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
