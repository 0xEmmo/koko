import type { WeeklyHours } from '../data/types'
import { addDays, diffDays, weekday, type DateKey } from './time'

export interface BusyInterval {
  date: DateKey
  start: number
  end: number
}

export interface DayQuery {
  date: DateKey
  hours: WeeklyHours
  durationMins: number
  bufferMins: number
  busy: readonly BusyInterval[]
  now: { date: DateKey; minutes: number }
  leadTimeHours: number
}

/** Short services get quarter-hour starts, longer ones half-hour. */
export const stepFor = (durationMins: number) => (durationMins <= 45 ? 15 : 30)

function startsLateEnough(q: DayQuery, start: number) {
  const minutesFromNow = diffDays(q.date, q.now.date) * 1440 + start - q.now.minutes
  return minutesFromNow >= q.leadTimeHours * 60
}

function fitsOpeningHours(q: DayQuery, start: number) {
  const end = start + q.durationMins
  return (q.hours[weekday(q.date)] ?? []).some(([open, close]) => start >= open && end <= close)
}

function clearOfBusy(q: DayQuery, start: number) {
  const end = start + q.durationMins
  return q.busy.every(
    (b) => b.date !== q.date || end + q.bufferMins <= b.start || start >= b.end + q.bufferMins,
  )
}

/** Whether an appointment could start at `start` on `q.date`. */
export function canStartAt(q: DayQuery, start: number) {
  return startsLateEnough(q, start) && fitsOpeningHours(q, start) && clearOfBusy(q, start)
}

/** Every bookable start time (minutes after midnight) for one day. */
export function slotsForDay(q: DayQuery): number[] {
  const step = stepFor(q.durationMins)
  const spans = q.hours[weekday(q.date)] ?? []
  const slots: number[] = []
  for (const [open, close] of spans) {
    for (let start = open; start + q.durationMins <= close; start += step) {
      if (canStartAt(q, start)) slots.push(start)
    }
  }
  return slots
}

export type RangeQuery = Omit<DayQuery, 'date'> & { from: DateKey; days: number }

export function slotsForRange(q: RangeQuery): Map<DateKey, number[]> {
  const out = new Map<DateKey, number[]>()
  for (let i = 0; i < q.days; i++) {
    const date = addDays(q.from, i)
    out.set(date, slotsForDay({ ...q, date }))
  }
  return out
}

export function firstAvailable(q: RangeQuery): { date: DateKey; start: number } | null {
  for (let i = 0; i < q.days; i++) {
    const date = addDays(q.from, i)
    const [start] = slotsForDay({ ...q, date })
    if (start !== undefined) return { date, start }
  }
  return null
}

export type DayPart = 'Morning' | 'Afternoon' | 'Evening'

export function dayPart(start: number): DayPart {
  if (start < 12 * 60) return 'Morning'
  if (start < 17 * 60) return 'Afternoon'
  return 'Evening'
}

export function groupByDayPart(slots: readonly number[]) {
  const groups: { part: DayPart; slots: number[] }[] = []
  for (const s of slots) {
    const part = dayPart(s)
    const last = groups[groups.length - 1]
    if (last && last.part === part) last.slots.push(s)
    else groups.push({ part, slots: [s] })
  }
  return groups
}
