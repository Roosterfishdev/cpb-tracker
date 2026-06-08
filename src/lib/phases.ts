import { differenceInCalendarDays } from 'date-fns'
import { keyToDate } from './dates'

export interface Phase {
  id: number
  label: string
  startDay: number
  endDay: number
  addedFoods: string[]
  cumulativeFoods: string[]
}

const PHASE_DEFINITIONS = [
  {
    id: 1,
    label: 'Strict Reset',
    startDay: 1,
    endDay: 28,
    addedFoods: [
      'Chicken breast',
      'Potatoes',
      'Broccoli',
      'Carrots',
      '2 eggs/day',
      '1 tbsp olive oil/day',
    ],
  },
  {
    id: 2,
    label: 'Veg & Fruit',
    startDay: 29,
    endDay: 35,
    addedFoods: [
      'Leafy greens',
      'Peppers',
      'Zucchini',
      'Cauliflower',
      'Green beans',
      'Tomato',
      'Berries',
      'Banana',
    ],
  },
  {
    id: 3,
    label: 'Fish & Protein',
    startDay: 36,
    endDay: 42,
    addedFoods: [
      'Salmon',
      'Sardines',
      'Mackerel',
      'Turkey',
      'Lean beef',
    ],
  },
  {
    id: 4,
    label: 'Fats & Calcium',
    startDay: 43,
    endDay: 49,
    addedFoods: [
      'Nuts',
      'Seeds',
      'Avocado',
      'Olives',
      'Greek yogurt',
      'Cottage cheese',
      'Milk',
      'Cheese',
      'Relaxed olive oil',
    ],
  },
  {
    id: 5,
    label: 'Carb Variety',
    startDay: 50,
    endDay: 56,
    addedFoods: [
      'Rice',
      'Oats',
      'Quinoa',
      'Beans',
      'Lentils',
      'Sweet potato',
      'Whole grains',
    ],
  },
  {
    id: 6,
    label: 'Integration',
    startDay: 57,
    endDay: 90,
    addedFoods: [
      'Dark chocolate',
      'Treats (reintroduced deliberately)',
      'Restaurant meals',
    ],
  },
] 

function buildPhases(): Phase[] {
  const cumulative: string[] = []
  return PHASE_DEFINITIONS.map((phase) => {
    cumulative.push(...phase.addedFoods)
    return {
      ...phase,
      cumulativeFoods: [...cumulative],
    }
  })
}

export const PHASES: Phase[] = buildPhases()

export function getDayNumber(
  startDate: string,
  today: Date = new Date(),
): number {
  const start = keyToDate(startDate)
  const diff = differenceInCalendarDays(today, start)
  return Math.min(90, Math.max(1, diff + 1))
}

export function getPhaseForDay(dayNumber: number): Phase {
  const clamped = Math.min(90, Math.max(1, dayNumber))
  return (
    PHASES.find((p) => clamped >= p.startDay && clamped <= p.endDay) ??
    PHASES[PHASES.length - 1]
  )
}

export function getAllowedFoods(dayNumber: number): string[] {
  return getPhaseForDay(dayNumber).cumulativeFoods
}

export function getGlobalRules(): string[] {
  return [
    'No liquid calories',
    'No diet sodas',
    'No artificial sweeteners',
    'Seasoning and sugar-free sauces OK',
  ]
}

export function getDaysRemainingInPhase(dayNumber: number): number {
  const phase = getPhaseForDay(dayNumber)
  return Math.max(0, phase.endDay - dayNumber)
}

export function getPhaseDays(startDay: number, endDay: number): number[] {
  const days: number[] = []
  for (let d = startDay; d <= endDay; d++) {
    days.push(d)
  }
  return days
}

export function dayNumberToDateKey(startDate: string, dayNumber: number): string {
  const start = keyToDate(startDate)
  const date = new Date(start)
  date.setDate(date.getDate() + dayNumber - 1)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
