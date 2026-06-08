import { useLiveQuery } from 'dexie-react-hooks'
import { db, ensureSeeded } from '../lib/db'
import { ACHIEVEMENT_DEFINITIONS } from '../lib/achievements'

export function AchievementsPage() {
  const earnedRecords = useLiveQuery(async () => {
    await ensureSeeded()
    return db.achievements.toArray()
  })

  const earnedMap = new Map(
    (earnedRecords ?? [])
      .filter((a) => a.earnedAt)
      .map((a) => [a.id, a.earnedAt!]),
  )

  const total = ACHIEVEMENT_DEFINITIONS.length
  const earnedCount = earnedMap.size
  const progressPct = total > 0 ? (earnedCount / total) * 100 : 0

  return (
    <div className="space-y-4 p-4">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Achievements</h1>
        <p className="mt-1 text-sm text-muted">
          {earnedCount} / {total} earned
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-elevated">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3">
        {ACHIEVEMENT_DEFINITIONS.map((def) => {
          const earnedAt = earnedMap.get(def.id)
          const earned = !!earnedAt

          return (
            <div
              key={def.id}
              className={`rounded-2xl border p-4 ${
                earned
                  ? 'border-accent/30 bg-surface'
                  : 'border-border bg-surface/50 opacity-60'
              }`}
            >
              <span className="text-2xl">{def.icon}</span>
              <h3 className="mt-2 text-sm font-semibold text-foreground">{def.title}</h3>
              <p className="mt-1 text-xs text-muted">{def.description}</p>
              {earned && earnedAt && (
                <p className="mt-2 text-xs text-accent">Earned {earnedAt}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
