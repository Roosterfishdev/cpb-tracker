import { useState } from 'react'
import { Leaf } from 'lucide-react'
import type { Phase } from '../lib/phases'
import { getGlobalRules } from '../lib/phases'
import { Card } from './Card'
import { SectionHeader } from './SectionHeader'

interface PhaseCardProps {
  phase: Phase
  daysRemaining: number
  allowedFoods: string[]
}

export function PhaseCard({ phase, daysRemaining, allowedFoods }: PhaseCardProps) {
  const [expanded, setExpanded] = useState(false)
  const rules = getGlobalRules()

  return (
    <Card>
      <SectionHeader
        icon={<Leaf size={18} strokeWidth={2.25} />}
        title={`Phase ${phase.id} · ${phase.label}`}
        subtitle={
          daysRemaining === 0
            ? 'Last day of this phase'
            : `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left`
        }
        onClick={() => setExpanded(!expanded)}
      />

      {expanded && (
        <div className="mb-4 flex flex-wrap gap-2">
          {allowedFoods.map((food) => (
            <span
              key={food}
              className="rounded-full bg-surface-muted px-3.5 py-1.5 text-xs font-medium text-foreground"
            >
              {food}
            </span>
          ))}
        </div>
      )}

      {!expanded && (
        <p className="mb-3 text-xs font-medium text-muted">
          {allowedFoods.length} allowed foods · tap to expand
        </p>
      )}

      <p className="text-xs leading-relaxed text-muted">{rules.join(' · ')}</p>
    </Card>
  )
}
