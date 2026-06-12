import { useCallback, useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, upsertCheckin } from '../lib/db'
import { evaluateAchievements, getAchievementById } from '../lib/achievements'
import { useToastStore } from '../store/toastStore'

export interface CheckinForm {
  weight: string
  energy?: 1 | 2 | 3 | 4 | 5
  cravings?: 1 | 2 | 3 | 4 | 5
  mood?: 1 | 2 | 3 | 4 | 5
}

export function checkinToForm(c?: {
  weight?: number
  energy?: 1 | 2 | 3 | 4 | 5
  cravings?: 1 | 2 | 3 | 4 | 5
  mood?: 1 | 2 | 3 | 4 | 5
}): CheckinForm {
  return {
    weight: c?.weight != null ? String(c.weight) : '',
    energy: c?.energy,
    cravings: c?.cravings,
    mood: c?.mood,
  }
}

export function formHasValue(form: CheckinForm): boolean {
  return (
    form.weight !== '' ||
    form.energy != null ||
    form.cravings != null ||
    form.mood != null
  )
}

export function hasSavedCheckin(c?: {
  weight?: number
  energy?: number
  cravings?: number
  mood?: number
} | null): boolean {
  if (!c) return false
  return c.weight != null || c.energy != null || c.cravings != null || c.mood != null
}

interface RatingSelectorProps {
  label: string
  value?: number
  onChange: (v: 1 | 2 | 3 | 4 | 5) => void
  disabled?: boolean
}

export function RatingSelector({
  label,
  value,
  onChange,
  disabled,
}: RatingSelectorProps) {
  return (
    <div>
      <p className="mb-2.5 text-sm font-semibold text-foreground">{label}</p>
      <div className="flex gap-2">
        {([1, 2, 3, 4, 5] as const).map((n) => (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => onChange(n)}
            className={`min-h-[44px] flex-1 rounded-full text-sm font-bold transition-all ${
              value === n
                ? 'bg-accent text-foreground shadow-sm'
                : 'bg-surface-muted text-muted'
            } ${disabled ? 'opacity-60' : ''}`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

interface CheckinEditorProps {
  date: string
  weightUnit: string
  compact?: boolean
  onSaved?: () => void
}

export function CheckinEditor({ date, weightUnit, compact, onSaved }: CheckinEditorProps) {
  const showToast = useToastStore((s) => s.show)
  const checkin = useLiveQuery(() => db.checkins.get(date), [date])

  const [form, setForm] = useState<CheckinForm>({ weight: '' })
  const [isEditing, setIsEditing] = useState(true)
  const [savedFlash, setSavedFlash] = useState(false)
  const loadedRef = useRef(false)

  useEffect(() => {
    loadedRef.current = false
    setForm({ weight: '' })
    setIsEditing(true)
    setSavedFlash(false)
  }, [date])

  useEffect(() => {
    if (checkin === undefined || loadedRef.current) return
    loadedRef.current = true
    if (hasSavedCheckin(checkin)) {
      setForm(checkinToForm(checkin))
      setIsEditing(false)
    }
  }, [checkin, date])

  const runAchievements = useCallback(async () => {
    const earned = await evaluateAchievements()
    for (const id of earned) {
      const def = getAchievementById(id)
      if (def) showToast(`Achievement unlocked: ${def.title}`)
    }
  }, [showToast])

  const handleSave = useCallback(async () => {
    await upsertCheckin(date, {
      weight: form.weight ? Number(form.weight) : undefined,
      energy: form.energy,
      cravings: form.cravings,
      mood: form.mood,
    })
    await runAchievements()
    setIsEditing(false)
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 2000)
    onSaved?.()
  }, [date, form, runAchievements, onSaved])

  const canSave = isEditing && formHasValue(form)

  return (
    <div className={compact ? 'space-y-3' : 'space-y-5'}>
      <div>
        <label className="mb-2 block text-sm font-semibold text-foreground">
          Weight ({weightUnit})
        </label>
        <input
          type="number"
          step="0.1"
          value={form.weight}
          disabled={!isEditing}
          onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
          className="w-full min-h-[48px] rounded-full bg-surface-muted px-4 text-sm font-medium text-foreground outline-none placeholder:text-muted disabled:opacity-70"
          placeholder="Optional"
        />
      </div>
      <RatingSelector
        label="Energy"
        value={form.energy}
        disabled={!isEditing}
        onChange={(energy) => setForm((f) => ({ ...f, energy }))}
      />
      <RatingSelector
        label="Cravings"
        value={form.cravings}
        disabled={!isEditing}
        onChange={(cravings) => setForm((f) => ({ ...f, cravings }))}
      />
      <RatingSelector
        label="Mood"
        value={form.mood}
        disabled={!isEditing}
        onChange={(mood) => setForm((f) => ({ ...f, mood }))}
      />

      <div className="flex items-center gap-3">
        {canSave && (
          <button
            type="button"
            onClick={handleSave}
            className="min-h-[48px] flex-1 rounded-full bg-accent text-sm font-bold text-foreground shadow-sm"
          >
            Save check-in
          </button>
        )}
        {!isEditing && hasSavedCheckin(checkin) && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="min-h-[48px] flex-1 rounded-full bg-surface-muted text-sm font-bold text-foreground"
          >
            Edit
          </button>
        )}
      </div>
      {savedFlash && (
        <p className="text-center text-sm font-bold text-accent-deep">Saved</p>
      )}
    </div>
  )
}
