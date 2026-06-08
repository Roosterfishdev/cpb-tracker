import { useLiveQuery } from 'dexie-react-hooks'
import { Trophy } from 'lucide-react'
import { db, ensureSeeded } from '../lib/db'
import { ACHIEVEMENT_DEFINITIONS } from '../lib/achievements'
import { Card } from '../components/Card'
import { ProgressBar } from '../components/ProgressBar'

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
    <div className="space-y-5 px-5 pb-6 pt-4">
      <header>
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/30">
            <Trophy size={20} className="text-accent-deep" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-foreground">Achievements</h1>
            <p className="text-sm font-medium text-muted">
              {earnedCount} / {total} earned
            </p>
          </div>
        </div>
        <ProgressBar value={progressPct} barClassName="bg-accent" height="h-2.5" />
      </header>

      <div className="grid grid-cols-2 gap-4">
        {ACHIEVEMENT_DEFINITIONS.map((def) => {
          const earnedAt = earnedMap.get(def.id)
          const earned = !!earnedAt

          return (
            <Card
              key={def.id}
              className={
                earned
                  ? 'bg-accent/10 !shadow-card'
                  : 'opacity-55 grayscale'
              }
            >
              <span className="text-3xl">{def.icon}</span>
              <h3 className="mt-3 text-sm font-bold text-foreground">{def.title}</h3>
              <p className="mt-1 text-xs font-medium leading-relaxed text-muted">
                {def.description}
              </p>
              {earned && earnedAt && (
                <p className="mt-2 text-xs font-semibold text-accent-deep">
                  Earned {earnedAt}
                </p>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
