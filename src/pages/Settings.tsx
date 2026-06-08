import { useState, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Settings, Calendar, Utensils, Database, ChevronUp, ChevronDown } from 'lucide-react'
import {
  ensureSeeded,
  getSettings,
  updateSettings,
  exportAllData,
  importAllData,
  resetAllData,
  DEFAULT_MEAL_SLOTS,
} from '../lib/db'
import {
  generateSlotId,
  formatTimeDisplay,
  type MealSlot,
} from '../lib/mealSlots'
import { getDayNumber, getPhaseForDay } from '../lib/phases'
import { evaluateAchievements } from '../lib/achievements'
import { useToastStore } from '../store/toastStore'
import { Card } from '../components/Card'
import { SectionHeader } from '../components/SectionHeader'

const APP_VERSION = '1.0.0'

export function SettingsPage() {
  const showToast = useToastStore((s) => s.show)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [newSlotName, setNewSlotName] = useState('')
  const [newSlotTime, setNewSlotTime] = useState('12:00')
  const [startDateWarning, setStartDateWarning] = useState(false)

  const settings = useLiveQuery(async () => {
    await ensureSeeded()
    return getSettings()
  })

  if (!settings) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-5">
        <p className="text-sm font-medium text-muted">Loading…</p>
      </div>
    )
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

  const updateSlot = async (index: number, patch: Partial<MealSlot>) => {
    const next = settings.mealSlots.map((s, i) =>
      i === index ? { ...s, ...patch } : s,
    )
    await updateSettings({ mealSlots: next })
  }

  const moveSlot = async (index: number, direction: -1 | 1) => {
    const next = [...settings.mealSlots]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    await updateSettings({ mealSlots: next })
  }

  const removeMealSlot = async (index: number) => {
    if (settings.mealSlots.length <= 1) return
    await updateSettings({
      mealSlots: settings.mealSlots.filter((_, i) => i !== index),
    })
  }

  const addMealSlot = async () => {
    const trimmed = newSlotName.trim()
    if (!trimmed) return
    const slot: MealSlot = {
      id: generateSlotId(trimmed),
      name: trimmed,
      time: newSlotTime,
    }
    await updateSettings({ mealSlots: [...settings.mealSlots, slot] })
    setNewSlotName('')
    setNewSlotTime('12:00')
  }

  return (
    <div className="space-y-5 px-5 pb-6 pt-4">
      <header>
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted">
            <Settings size={20} className="text-foreground" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground">Settings</h1>
        </div>
      </header>

      <Card>
        <SectionHeader icon={<Calendar size={18} strokeWidth={2.25} />} title="Program" />
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">
              Start date
            </label>
            <input
              type="date"
              value={settings.startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="w-full min-h-[48px] rounded-full bg-surface-muted px-4 text-sm font-medium text-foreground outline-none"
            />
            {startDateWarning && (
              <p className="mt-2 text-xs font-medium text-accent-deep">
                Changing start date shifts all phase calculations.
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">
              Weight unit
            </label>
            <div className="flex gap-2">
              {(['kg', 'lb'] as const).map((unit) => (
                <button
                  key={unit}
                  type="button"
                  onClick={() => updateSettings({ weightUnit: unit })}
                  className={`min-h-[48px] flex-1 rounded-full text-sm font-bold transition-all ${
                    settings.weightUnit === unit
                      ? 'bg-accent text-foreground shadow-sm'
                      : 'bg-surface-muted text-muted'
                  }`}
                >
                  {unit}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <SectionHeader icon={<Utensils size={18} strokeWidth={2.25} />} title="Meal slots" />
        <div className="space-y-3">
          {settings.mealSlots.map((slot, index) => (
            <div key={slot.id} className="rounded-2xl bg-surface-muted/60 p-3">
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveSlot(index, -1)}
                    className="rounded p-0.5 text-muted disabled:opacity-30"
                    aria-label="Move up"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    type="button"
                    disabled={index === settings.mealSlots.length - 1}
                    onClick={() => moveSlot(index, 1)}
                    className="rounded p-0.5 text-muted disabled:opacity-30"
                    aria-label="Move down"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
                <input
                  type="text"
                  defaultValue={slot.name}
                  onBlur={(e) => updateSlot(index, { name: e.target.value.trim() || slot.name })}
                  className="min-h-[44px] flex-1 rounded-full bg-white px-4 text-sm font-medium text-foreground outline-none"
                />
                <input
                  type="time"
                  value={slot.time}
                  onChange={(e) => updateSlot(index, { time: e.target.value })}
                  className="min-h-[44px] w-[7.5rem] rounded-full bg-white px-2 text-sm font-medium text-foreground outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeMealSlot(index)}
                  disabled={settings.mealSlots.length <= 1}
                  className="shrink-0 rounded-full px-3 py-2 text-xs font-semibold text-danger disabled:opacity-30"
                >
                  Remove
                </button>
              </div>
              <p className="mt-1 pl-9 text-[11px] font-medium text-muted">
                Displays as {slot.name} · {formatTimeDisplay(slot.time)}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            type="text"
            value={newSlotName}
            onChange={(e) => setNewSlotName(e.target.value)}
            placeholder="New slot name"
            className="min-h-[48px] min-w-[140px] flex-1 rounded-full bg-surface-muted px-4 text-sm font-medium text-foreground outline-none placeholder:text-muted"
          />
          <input
            type="time"
            value={newSlotTime}
            onChange={(e) => setNewSlotTime(e.target.value)}
            className="min-h-[48px] rounded-full bg-surface-muted px-3 text-sm font-medium text-foreground outline-none"
          />
          <button
            type="button"
            onClick={addMealSlot}
            className="rounded-full bg-accent px-5 py-2 text-sm font-bold text-foreground shadow-sm"
          >
            Add
          </button>
        </div>
        <button
          type="button"
          onClick={() =>
            updateSettings({ mealSlots: DEFAULT_MEAL_SLOTS.map((s) => ({ ...s })) })
          }
          className="mt-3 text-xs font-medium text-muted"
        >
          Reset to defaults
        </button>
      </Card>

      <Card>
        <SectionHeader icon={<Database size={18} strokeWidth={2.25} />} title="Data" />
        <div className="space-y-2">
          <ActionButton onClick={handleExport}>Export data</ActionButton>
          <ActionButton onClick={() => fileInputRef.current?.click()}>Import data</ActionButton>
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
              className="w-full min-h-[48px] rounded-full bg-pastel-pink/40 text-sm font-bold text-danger"
            >
              Reset everything
            </button>
          ) : (
            <div className="space-y-2 rounded-2xl bg-pastel-pink/30 p-4">
              <p className="text-sm font-semibold text-danger">
                This will delete all your data. Are you sure?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 min-h-[44px] rounded-full bg-danger text-sm font-bold text-white"
                >
                  Yes, reset
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="flex-1 min-h-[44px] rounded-full bg-surface-muted text-sm font-semibold text-muted"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 text-base font-bold text-foreground">About</h2>
        <p className="text-sm font-medium text-muted">
          Day {dayNumber} · Phase {phase.id}: {phase.label}
        </p>
        <p className="text-sm font-medium text-muted">Version {APP_VERSION}</p>
      </Card>
    </div>
  )
}

function ActionButton({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full min-h-[48px] rounded-full bg-surface-muted text-sm font-bold text-foreground"
    >
      {children}
    </button>
  )
}
