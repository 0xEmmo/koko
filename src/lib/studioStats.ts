import type { Booking } from '../api/types'
import type { WeeklyHours } from '../data/types'
import { addDays, weekday, type DateKey } from './time'

export interface WeekStats {
  bookings: number
  depositsCollected: number
  dueOnTheDay: number
  /** Share of open minutes that are booked, 0–1. */
  occupancy: number
  openMinutes: number
}

const live = (b: Booking) => b.status === 'confirmed' || b.status === 'completed'

export function openMinutesOn(hours: WeeklyHours, date: DateKey, blockedDays: Set<DateKey>) {
  if (blockedDays.has(date)) return 0
  return (hours[weekday(date)] ?? []).reduce((sum, [a, b]) => sum + (b - a), 0)
}

export function weekStats(opts: {
  bookings: readonly Booking[]
  hours: WeeklyHours
  from: DateKey
  days: number
  blockedDays: Set<DateKey>
}): WeekStats {
  const to = addDays(opts.from, opts.days - 1)
  const inRange = opts.bookings.filter((b) => b.date >= opts.from && b.date <= to && live(b))
  let openMinutes = 0
  for (let i = 0; i < opts.days; i++) openMinutes += openMinutesOn(opts.hours, addDays(opts.from, i), opts.blockedDays)
  const bookedMinutes = inRange.reduce((s, b) => s + (b.end - b.start), 0)
  return {
    bookings: inRange.length,
    depositsCollected: inRange.reduce((s, b) => s + b.deposit, 0),
    dueOnTheDay: inRange.reduce((s, b) => s + (b.price - b.deposit), 0),
    occupancy: openMinutes ? Math.min(1, bookedMinutes / openMinutes) : 0,
    openMinutes,
  }
}

export function greeting(minutes: number) {
  if (minutes < 12 * 60) return 'Good morning'
  if (minutes < 17 * 60) return 'Good afternoon'
  return 'Good evening'
}
