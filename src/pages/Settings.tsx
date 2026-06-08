import { useState, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ensureSeeded,
  getSettings,
  updateSettings,
  exportAllData,
  importAllData,
  resetAllData,
  DEFAULT_MEAL_SLOTS,
} from '../lib/db'
import { getDayNumber, getPhaseForDay } from '../lib/phases'
import { evaluateAchievements } from '../lib/achievements'
import { useToastStore } from '../store/toastStore'

const APP_VERSION = '1.0.0'

export function SettingsPage() {
  const showToast = useToastStore((s) => s.show)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [newSlot, setNewSlot] = useState('')
  const [startDateWarning, setStartDateWarning] = useState(false)

  const settings = useLiveQuery(async () => {
    await ensureSeeded()
    return getSettings()
  })

  if (!settings) {
    return <div className="p-4 text-muted">Loading…</div>
  }

  const dayNumber = getDayNumber(settings.startDate)
  const phase = getPhaseForDay(dayNumber)

  const handleStartDateChange = async (value: string) => {
    setStartDateWarning(true)
    await updateSettings({ startDate: value })
  }

  const handleExport = async () => {
    const data = await exportAllData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cpb-tracker-backup-${settings.startDate}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      await importAllData(data)
      showToast('Data imported successfully')
      await evaluateAchievements()
    } catch {
      showToast('Import failed — invalid file')
    }
    e.target.value = ''
  }

  const handleReset = async () => {
    await resetAllData()
    setConfirmReset(false)
    showToast('All data reset')
  }

  const addMealSlot = async () => {
    const trimmed = newSlot.trim()
    if (!trimmed || settings.mealSlots.includes(trimmed)) return
    await updateSettings({ mealSlots: [...settings.mealSlots, trimmed] })
    setNewSlot('')
  }

  const removeMealSlot = async (slot: string) => {
    if (settings.mealSlots.length <= 1) return
    await updateSettings({
      mealSlots: settings.mealSlots.filter((s) => s !== slot),
    })
  }

  const renameMealSlot = async (oldSlot: string, newName: string) => {
    const trimmed = newName.trim()
    if (!trimmed) return
    await updateSettings({
      mealSlots: settings.mealSlots.map((s) => (s === oldSlot ? trimmed : s)),
    })
  }

  return (
    <div className="space-y-4 p-4">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
      </header>

      <section className="rounded-2xl border border-border bg-surface p-4 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Start date</label>
          <input
            type="date"
            value={settings.startDate}
            onChange={(e) => handleStartDateChange(e.target.value)}
            className="w-full min-h-[44px] rounded-xl border border-border bg-surface-elevated px-3 text-sm text-foreground"
          />
          {startDateWarning && (
            <p className="mt-1 text-xs text-accent-muted">
              Changing start date shifts all phase calculations.
            </p>
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">Weight unit</label>
          <div className="flex gap-2">
            {(['kg', 'lb'] as const).map((unit) => (
              <button
                key={unit}
                type="button"
                onClick={() => updateSettings({ weightUnit: unit })}
                className={`min-h-[44px] flex-1 rounded-xl border text-sm font-medium ${
                  settings.weightUnit === unit
                    ? 'border-accent bg-accent/15 text-accent'
                    : 'border-border bg-surface-elevated text-muted'
                }`}
              >
                {unit}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="mb-3 text-base font-semibold text-foreground">Meal slots</h2>
        <div className="space-y-2">
          {settings.mealSlots.map((slot) => (
            <div key={slot} className="flex items-center gap-2">
              <input
                type="text"
                defaultValue={slot}
                onBlur={(e) => renameMealSlot(slot, e.target.value)}
                className="min-h-[44px] flex-1 rounded-xl border border-border bg-surface-elevated px-3 text-sm text-foreground"
              />
              <button
                type="button"
                onClick={() => removeMealSlot(slot)}
                disabled={settings.mealSlots.length <= 1}
                className="rounded-lg px-3 py-2 text-xs text-danger disabled:opacity-30"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={newSlot}
            onChange={(e) => setNewSlot(e.target.value)}
            placeholder="New slot name"
            className="min-h-[44px] flex-1 rounded-xl border border-border bg-surface-elevated px-3 text-sm text-foreground"
          />
          <button
            type="button"
            onClick={addMealSlot}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-background"
          >
            Add
          </button>
        </div>
        <button
          type="button"
          onClick={() => updateSettings({ mealSlots: [...DEFAULT_MEAL_SLOTS] })}
          className="mt-2 text-xs text-muted hover:text-foreground"
        >
          Reset to defaults
        </button>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4 space-y-3">
        <h2 className="text-base font-semibold text-foreground">Data</h2>
        <button
          type="button"
          onClick={handleExport}
          className="w-full min-h-[44px] rounded-xl border border-border bg-surface-elevated text-sm font-medium text-foreground"
        >
          Export data
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full min-h-[44px] rounded-xl border border-border bg-surface-elevated text-sm font-medium text-foreground"
        >
          Import data
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleImport}
        />
        {!confirmReset ? (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="w-full min-h-[44px] rounded-xl border border-danger/50 text-sm font-medium text-danger"
          >
            Reset everything
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-danger">This will delete all your data. Are you sure?</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 min-h-[44px] rounded-xl bg-danger text-sm font-medium text-white"
              >
                Yes, reset
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="flex-1 min-h-[44px] rounded-xl border border-border text-sm text-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="mb-2 text-base font-semibold text-foreground">About</h2>
        <p className="text-sm text-muted">Day {dayNumber} · Phase {phase.id}: {phase.label}</p>
        <p className="text-sm text-muted">Version {APP_VERSION}</p>
      </section>
    </div>
  )
}
