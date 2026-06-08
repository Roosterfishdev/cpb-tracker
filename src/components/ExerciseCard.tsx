import type { Exercise, ExerciseType } from '../lib/db'

const EXERCISE_TYPES: { value: ExerciseType; label: string }[] = [
  { value: 'walking', label: 'Walking' },
  { value: 'padel', label: 'Padel' },
  { value: 'boxing', label: 'Boxing' },
  { value: 'gym', label: 'Gym' },
  { value: 'other', label: 'Other' },
]

interface ExerciseCardProps {
  exercise?: Exercise
  weeklyCount: number
  onUpdate: (data: Omit<Exercise, 'id' | 'date'>) => void
}

export function ExerciseCard({ exercise, weeklyCount, onUpdate }: ExerciseCardProps) {
  const didExercise = exercise?.didExercise ?? false

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Exercise</h2>
        <span className="rounded-full bg-surface-elevated px-3 py-1 text-xs text-muted">
          Exercised {weeklyCount}/7 this week
        </span>
      </div>

      <button
        type="button"
        onClick={() =>
          onUpdate({
            didExercise: !didExercise,
            type: undefined,
            minutes: undefined,
            note: undefined,
          })
        }
        className={`mb-3 w-full min-h-[44px] rounded-xl border text-sm font-medium transition-colors ${
          didExercise
            ? 'border-accent bg-accent/15 text-accent'
            : 'border-border bg-surface-elevated text-foreground'
        }`}
      >
        Did you exercise today?
      </button>

      {didExercise && (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-muted">Type</label>
            <select
              value={exercise?.type ?? ''}
              onChange={(e) =>
                onUpdate({
                  didExercise: true,
                  type: e.target.value as ExerciseType,
                  minutes: exercise?.minutes,
                  note: exercise?.note,
                })
              }
              className="w-full min-h-[44px] rounded-xl border border-border bg-background px-3 text-sm text-foreground"
            >
              <option value="">Select type…</option>
              {EXERCISE_TYPES.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">Minutes (optional)</label>
            <input
              type="number"
              min={0}
              value={exercise?.minutes ?? ''}
              onChange={(e) =>
                onUpdate({
                  didExercise: true,
                  type: exercise?.type,
                  minutes: e.target.value ? Number(e.target.value) : undefined,
                  note: exercise?.note,
                })
              }
              className="w-full min-h-[44px] rounded-xl border border-border bg-background px-3 text-sm text-foreground"
              placeholder="30"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">Note (optional)</label>
            <input
              type="text"
              value={exercise?.note ?? ''}
              onChange={(e) =>
                onUpdate({
                  didExercise: true,
                  type: exercise?.type,
                  minutes: exercise?.minutes,
                  note: e.target.value || undefined,
                })
              }
              className="w-full min-h-[44px] rounded-xl border border-border bg-background px-3 text-sm text-foreground"
              placeholder="Morning session"
            />
          </div>
        </div>
      )}
    </section>
  )
}
