import { Dumbbell } from 'lucide-react'
import type { Exercise, ExerciseType } from '../lib/db'
import { Card } from './Card'
import { SectionHeader } from './SectionHeader'

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
    <Card>
      <SectionHeader
        icon={<Dumbbell size={18} strokeWidth={2.25} />}
        title="Exercise"
        subtitle={`${weeklyCount}/7 days this week`}
      />

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
        className={`mb-4 w-full min-h-[48px] rounded-full text-sm font-bold transition-all ${
          didExercise
            ? 'bg-accent text-foreground shadow-sm'
            : 'bg-surface-muted text-foreground'
        }`}
      >
        Did you exercise today?
      </button>

      {didExercise && (
        <div className="space-y-3">
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
            className="w-full min-h-[48px] rounded-full bg-surface-muted px-4 text-sm font-medium text-foreground outline-none"
          >
            <option value="">Select type…</option>
            {EXERCISE_TYPES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

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
            className="w-full min-h-[48px] rounded-full bg-surface-muted px-4 text-sm font-medium text-foreground outline-none placeholder:text-muted"
            placeholder="Minutes (optional)"
          />

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
            className="w-full min-h-[48px] rounded-full bg-surface-muted px-4 text-sm font-medium text-foreground outline-none placeholder:text-muted"
            placeholder="Note (optional)"
          />
        </div>
      )}
    </Card>
  )
}
