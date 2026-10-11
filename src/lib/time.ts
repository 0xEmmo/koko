/**
 * Kòkó only operates in Nigeria, so every wall-clock time is Africa/Lagos
 * (UTC+1, no daylight saving). Dates travel around as 'YYYY-MM-DD' strings
 * and times of day as minutes after midnight, which keeps slot maths simple
 * and avoids the browser's own time zone leaking in.
 */
export const TIME_ZONE = 'Africa/Lagos'
const LAGOS_OFFSET_MINUTES = 60

export type DateKey = string

const pad = (n: number) => String(n).padStart(2, '0')

export function toDateKey(year: number, month: number, day: number): DateKey {
  return `${year}-${pad(month)}-${pad(day)}`
}

export function parseDateKey(key: DateKey) {
  const [y, m, d] = key.split('-').map(Number)
  return { year: y!, month: m!, day: d! }
}

/** The calendar date and minute-of-day in Lagos for a given instant. */
export function lagosNow(now: Date = new Date()) {
  const shifted = new Date(now.getTime() + LAGOS_OFFSET_MINUTES * 60_000)
  return {
    date: toDateKey(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate()),
    minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  }
}

export function addDays(key: DateKey, days: number): DateKey {
  const { year, month, day } = parseDateKey(key)
  const d = new Date(Date.UTC(year, month - 1, day + days))
  return toDateKey(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
}

export function addMonths(key: DateKey, months: number): DateKey {
  const { year, month, day } = parseDateKey(key)
  const first = new Date(Date.UTC(year, month - 1 + months, 1))
  const lastDay = daysInMonth(first.getUTCFullYear(), first.getUTCMonth() + 1)
  return toDateKey(first.getUTCFullYear(), first.getUTCMonth() + 1, Math.min(day, lastDay))
}

export function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/** 0 = Sunday … 6 = Saturday */
export function weekday(key: DateKey) {
  const { year, month, day } = parseDateKey(key)
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

export function diffDays(a: DateKey, b: DateKey) {
  const pa = parseDateKey(a)
  const pb = parseDateKey(b)
  return Math.round(
    (Date.UTC(pa.year, pa.month - 1, pa.day) - Date.UTC(pb.year, pb.month - 1, pb.day)) / 86_400_000,
  )
}

/** Absolute instant for a Lagos date + minute-of-day. */
export function toInstant(key: DateKey, minutes: number): Date {
  const { year, month, day } = parseDateKey(key)
  return new Date(Date.UTC(year, month - 1, day, 0, minutes - LAGOS_OFFSET_MINUTES))
}

export function toIsoLagos(key: DateKey, minutes: number) {
  return `${key}T${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}:00+01:00`
}

export function formatClock(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  const suffix = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return m === 0 ? `${h12}${suffix}` : `${h12}:${pad(m)}${suffix}`
}

export function formatDuration(mins: number) {
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  const hours = `${h} hr${h > 1 ? 's' : ''}`
  return m ? `${hours} ${m} min` : hours
}

const dateFmt = (opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...opts })

const longFmt = dateFmt({ weekday: 'long', day: 'numeric', month: 'long' })
const shortFmt = dateFmt({ weekday: 'short', day: 'numeric', month: 'short' })
const monthFmt = dateFmt({ month: 'long', year: 'numeric' })

const asUtc = (key: DateKey) => {
  const { year, month, day } = parseDateKey(key)
  return new Date(Date.UTC(year, month - 1, day))
}

export const formatDateLong = (key: DateKey) => longFmt.format(asUtc(key))
export const formatDateShort = (key: DateKey) => shortFmt.format(asUtc(key))
export const formatMonth = (key: DateKey) => monthFmt.format(asUtc(key))

/** "Today", "Tomorrow", or "Thu 16 Oct" relative to `today`. */
export function relativeDay(key: DateKey, today: DateKey) {
  const d = diffDays(key, today)
  if (d === 0) return 'Today'
  if (d === 1) return 'Tomorrow'
  return formatDateShort(key)
}
