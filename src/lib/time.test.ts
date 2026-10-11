import { describe, expect, it } from 'vitest'
import {
  addDays,
  addMonths,
  diffDays,
  formatClock,
  formatDuration,
  lagosNow,
  relativeDay,
  toInstant,
  weekday,
} from './time'

describe('lagosNow', () => {
  it('shifts UTC by one hour', () => {
    expect(lagosNow(new Date('2026-10-11T22:30:00Z'))).toEqual({ date: '2026-10-11', minutes: 23 * 60 + 30 })
  })

  it('rolls over to the next day after 23:00 UTC', () => {
    expect(lagosNow(new Date('2026-10-11T23:15:00Z'))).toEqual({ date: '2026-10-12', minutes: 15 })
  })
})

describe('date arithmetic', () => {
  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('clamps the day when adding months', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2026-11-15', 2)).toBe('2027-01-15')
  })

  it('knows the weekday', () => {
    expect(weekday('2026-10-11')).toBe(0)
    expect(weekday('2026-10-17')).toBe(6)
  })

  it('counts days between keys', () => {
    expect(diffDays('2026-11-01', '2026-10-30')).toBe(2)
  })

  it('converts Lagos wall time to an instant', () => {
    expect(toInstant('2026-10-11', 9 * 60).toISOString()).toBe('2026-10-11T08:00:00.000Z')
  })
})

describe('formatting', () => {
  it('formats clock times without trailing zeros', () => {
    expect(formatClock(9 * 60)).toBe('9am')
    expect(formatClock(13 * 60 + 30)).toBe('1:30pm')
    expect(formatClock(0)).toBe('12am')
    expect(formatClock(12 * 60)).toBe('12pm')
  })

  it('formats durations', () => {
    expect(formatDuration(45)).toBe('45 min')
    expect(formatDuration(60)).toBe('1 hr')
    expect(formatDuration(150)).toBe('2 hrs 30 min')
  })

  it('describes nearby days relatively', () => {
    expect(relativeDay('2026-10-11', '2026-10-11')).toBe('Today')
    expect(relativeDay('2026-10-12', '2026-10-11')).toBe('Tomorrow')
    expect(relativeDay('2026-10-15', '2026-10-11')).toBe('Thu 15 Oct')
  })
})
