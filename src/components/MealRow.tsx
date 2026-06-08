import type { Meal } from '../lib/db'

interface MealRowProps {
  slot: string
  meal?: Meal
  onUpdate: (updates: Partial<Meal>) => void
}

export function MealRow({ slot, meal, onUpdate }: MealRowProps) {
  const eaten = meal?.eaten ?? false
  const onPlan = meal?.onPlan ?? false
  const skipped = meal?.skipped ?? false

  if (skipped) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-border bg-surface-elevated px-4 py-3">
        <span className="font-medium text-muted line-through">{slot}</span>
        <button
          type="button"
          onClick={() => onUpdate({ skipped: false, eaten: false, onPlan: false })}
          className="text-xs text-accent"
        >
          Undo skip
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-surface-elevated px-4 py-3">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-medium text-foreground">{slot}</span>
        <button
          type="button"
          onClick={() =>
            onUpdate({ skipped: true, eaten: false, onPlan: false })
          }
          className="text-xs text-muted hover:text-foreground"
        >
          Skip
        </button>
      </div>
      <div className="flex gap-2">
        <ToggleButton
          label="Eaten"
          active={eaten}
          onClick={() => {
            const nextEaten = !eaten
            onUpdate({
              eaten: nextEaten,
              onPlan: nextEaten ? onPlan : false,
            })
          }}
        />
        <ToggleButton
          label="On plan"
          active={onPlan}
          disabled={!eaten}
          onClick={() => onUpdate({ onPlan: !onPlan })}
        />
      </div>
    </div>
  )
}

function ToggleButton({
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
      className={`min-h-[44px] flex-1 rounded-lg border text-sm font-medium transition-colors ${
        active
          ? 'border-accent bg-accent/15 text-accent'
          : 'border-border bg-background text-muted'
      } ${disabled ? 'cursor-not-allowed opacity-40' : 'hover:border-accent/50'}`}
    >
      {label}
    </button>
  )
}
