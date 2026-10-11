import { describe, expect, it } from 'vitest'
import type { WeeklyHours } from '../data/types'
import { canStartAt, firstAvailable, groupByDayPart, slotsForDay, stepFor, type DayQuery } from './availability'

const nineToFive: WeeklyHours = [[], [[540, 1020]], [[540, 1020]], [[540, 1020]], [[540, 1020]], [[540, 1020]], []]

// 2026-10-12 is a Monday
const base: DayQuery = {
  date: '2026-10-12',
  hours: nineToFive,
  durationMins: 60,
  bufferMins: 0,
  busy: [],
  now: { date: '2026-10-11', minutes: 600 },
  leadTimeHours: 0,
}

describe('slotsForDay', () => {
  it('lists half-hour starts that finish before closing', () => {
    const slots = slotsForDay(base)
    expect(slots[0]).toBe(540)
    expect(slots.at(-1)).toBe(960)
    expect(slots).toHaveLength(15)
  })

  it('uses 15 minute steps for short services', () => {
    expect(stepFor(30)).toBe(15)
    expect(stepFor(60)).toBe(30)
    expect(slotsForDay({ ...base, durationMins: 30 }).slice(0, 3)).toEqual([540, 555, 570])
  })

  it('returns nothing on closed days', () => {
    expect(slotsForDay({ ...base, date: '2026-10-11' })).toEqual([])
  })

  it('skips anything that overlaps an existing booking', () => {
    const slots = slotsForDay({ ...base, busy: [{ date: '2026-10-12', start: 600, end: 690 }] })
    expect(slots).toContain(540)
    expect(slots).not.toContain(570)
    expect(slots).not.toContain(660)
    expect(slots).toContain(690)
  })

  it('keeps the buffer clear on both sides of a booking', () => {
    const q = { ...base, bufferMins: 30, busy: [{ date: '2026-10-12', start: 660, end: 720 }] }
    expect(canStartAt(q, 570)).toBe(true)
    expect(canStartAt(q, 600)).toBe(false)
    expect(canStartAt(q, 720)).toBe(false)
    expect(canStartAt(q, 750)).toBe(true)
  })

  it('ignores bookings on other days', () => {
    const slots = slotsForDay({ ...base, busy: [{ date: '2026-10-13', start: 540, end: 1020 }] })
    expect(slots).toHaveLength(15)
  })

  it('respects lead time from now, including across midnight', () => {
    const q = { ...base, now: { date: '2026-10-11', minutes: 22 * 60 }, leadTimeHours: 12 }
    expect(canStartAt(q, 9 * 60)).toBe(false)
    expect(canStartAt(q, 10 * 60)).toBe(true)
  })

  it('never offers times in the past today', () => {
    const q = { ...base, now: { date: '2026-10-12', minutes: 13 * 60 + 10 } }
    expect(slotsForDay(q)[0]).toBe(13 * 60 + 30)
  })

  it('handles split opening hours', () => {
    const split: WeeklyHours = [[], [[540, 720], [840, 1020]], [], [], [], [], []]
    const slots = slotsForDay({ ...base, hours: split, durationMins: 120 })
    expect(slots).toEqual([540, 570, 600, 840, 870, 900])
  })

  it('treats a whole-day block as fully booked', () => {
    expect(slotsForDay({ ...base, busy: [{ date: '2026-10-12', start: 0, end: 1440 }] })).toEqual([])
  })
})

describe('firstAvailable', () => {
  it('finds the next open slot across days', () => {
    const q = { ...base, from: '2026-10-10', days: 7, busy: [{ date: '2026-10-12', start: 0, end: 1440 }] }
    expect(firstAvailable(q)).toEqual({ date: '2026-10-13', start: 540 })
  })

  it('returns null when the window is full', () => {
    expect(firstAvailable({ ...base, from: '2026-10-10', days: 2 })).toBeNull()
  })
})

describe('groupByDayPart', () => {
  it('buckets slots into morning, afternoon and evening', () => {
    expect(groupByDayPart([540, 600, 780, 1080])).toEqual([
      { part: 'Morning', slots: [540, 600] },
      { part: 'Afternoon', slots: [780] },
      { part: 'Evening', slots: [1080] },
    ])
  })
})
