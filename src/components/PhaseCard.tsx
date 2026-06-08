import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { Phase } from '../lib/phases'
import { getGlobalRules } from '../lib/phases'

interface PhaseCardProps {
  phase: Phase
  daysRemaining: number
  allowedFoods: string[]
}

export function PhaseCard({ phase, daysRemaining, allowedFoods }: PhaseCardProps) {
  const [expanded, setExpanded] = useState(false)
  const rules = getGlobalRules()

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-accent">
            Phase {phase.id}
          </p>
          <h2 className="text-lg font-semibold text-foreground">{phase.label}</h2>
          <p className="mt-1 text-sm text-muted">
            {daysRemaining === 0
              ? 'Last day of this phase'
              : `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left in phase`}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="mt-3 flex w-full items-center justify-between rounded-xl bg-surface-elevated px-3 py-2.5 text-sm font-medium text-foreground"
      >
        Allowed foods ({allowedFoods.length})
        {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {expanded && (
        <div className="mt-3 flex flex-wrap gap-2">
          {allowedFoods.map((food) => (
            <span
              key={food}
              className="rounded-full border border-border bg-surface-elevated px-3 py-1 text-xs text-foreground"
            >
              {food}
            </span>
          ))}
        </div>
      )}

      <p className="mt-3 text-xs leading-relaxed text-muted">
        {rules.join(' · ')}
      </p>
    </section>
  )
}
