import { describe, it, expect } from 'vitest'
import {
  getDayNumber,
  getPhaseForDay,
  getAllowedFoods,
  PHASES,
} from './phases'

describe('phase engine', () => {
  const startDate = '2026-01-01'

  it('maps day boundaries to correct phases', () => {
    expect(getPhaseForDay(1).id).toBe(1)
    expect(getPhaseForDay(28).id).toBe(1)
    expect(getPhaseForDay(29).id).toBe(2)
    expect(getPhaseForDay(56).id).toBe(5)
    expect(getPhaseForDay(57).id).toBe(6)
    expect(getPhaseForDay(90).id).toBe(6)
  })

  it('computes day number from start date', () => {
    expect(getDayNumber(startDate, new Date(2026, 0, 0))).toBe(1)
    expect(getDayNumber(startDate, new Date(2026, 0, 27))).toBe(27)
    expect(getDayNumber(startDate, new Date(2026, 0, 28))).toBe(28)
    expect(getDayNumber(startDate, new Date(2026, 0, 29))).toBe(29)
    expect(getDayNumber(startDate, new Date(2026, 2, 31))).toBe(90)
    expect(getDayNumber(startDate, new Date(2027, 0, 1))).toBe(90)
  })

  it('builds cumulative food lists', () => {
    const phase1Foods = getAllowedFoods(1)
    const phase2Foods = getAllowedFoods(29)
    const phase6Foods = getAllowedFoods(90)

    expect(phase1Foods).toContain('Chicken breast')
    expect(phase2Foods.length).toBeGreaterThan(phase1Foods.length)
    expect(phase2Foods).toContain('Berries')
    expect(phase6Foods.length).toBe(PHASES[5].cumulativeFoods.length)
    expect(phase6Foods).toContain('Dark chocolate')
  })
})
