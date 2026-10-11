import { creatives, findCreative, findService } from '../data/creatives'
import type { Craft, Creative, Service } from '../data/types'
import { canStartAt, firstAvailable, slotsForRange, type BusyInterval } from '../lib/availability'
import { simulateCharge, digitsOnly } from '../lib/payment'
import { cancellationOutcome, depositFor, rescheduleBlock, type CancelOutcome } from '../lib/policy'
import { addDays, lagosNow, toInstant, type DateKey } from '../lib/time'
import { readDb, transact } from './db'
import { clientId, tabId } from './identity'
import { simulateRequest } from './network'
import { bookingRef, uid } from './random'
import { ApiError, type Block, type Booking, type ClientDetails, type Database, type Hold } from './types'

export const BOOKING_WINDOW_DAYS = 56

export function holdDurationMs() {
  const override = localStorage.getItem('koko.holdSeconds')
  return (override ? Number(override) : 10 * 60) * 1000
}

function requireCreative(id: string): Creative {
  const c = findCreative(id)
  if (!c) throw new ApiError('not-found', 'We couldn’t find that creative.')
  return c
}

function requireService(creative: Creative, serviceId: string): Service {
  const s = findService(creative, serviceId)
  if (!s) throw new ApiError('not-found', 'That service is no longer offered.')
  return s
}

interface BusyOptions {
  ignoreBookingId?: string
  ignoreOwnHolds?: boolean
}

function busyFor(db: Database, creativeId: string, opts: BusyOptions = {}): BusyInterval[] {
  const me = tabId()
  return [
    ...db.bookings.filter((b) => b.creativeId === creativeId && b.status === 'confirmed' && b.id !== opts.ignoreBookingId),
    ...db.holds.filter((h) => h.creativeId === creativeId && !(opts.ignoreOwnHolds && h.tabId === me)),
    ...db.blocks.filter((b) => b.creativeId === creativeId),
  ]
}

function slotQuery(creative: Creative, service: Service, busy: BusyInterval[]) {
  return {
    hours: creative.hours,
    durationMins: service.durationMins,
    bufferMins: creative.bufferMins,
    busy,
    now: lagosNow(),
    leadTimeHours: creative.leadTimeHours,
  }
}

/* ---------- directory ---------- */

export interface DirectoryFilters {
  q?: string
  craft?: Craft | 'all'
  city?: string
  maxPrice?: number
  thisWeek?: boolean
  sort?: 'soonest' | 'rating' | 'price'
}

export interface DirectoryEntry {
  creative: Creative
  fromPrice: number
  rating: number
  reviewCount: number
  next: { date: DateKey; start: number } | null
}

export const ratingOf = (c: Creative) =>
  c.reviews.length ? c.reviews.reduce((s, r) => s + r.rating, 0) / c.reviews.length : 0

/** Next opening for the creative's quickest service. */
function nextOpening(db: Database, creative: Creative, days: number) {
  const quickest = [...creative.services].sort((a, b) => a.durationMins - b.durationMins)[0]!
  return firstAvailable({
    ...slotQuery(creative, quickest, busyFor(db, creative.id, { ignoreOwnHolds: true })),
    from: lagosNow().date,
    days,
  })
}

export function matchesQuery(creative: Creative, q: string) {
  const needle = q.trim().toLowerCase()
  if (!needle) return true
  const hay = [creative.name, creative.headline, creative.area, creative.city, ...creative.services.map((s) => s.name)]
    .join(' ')
    .toLowerCase()
  return needle.split(/\s+/).every((word) => hay.includes(word))
}

export async function listCreatives(filters: DirectoryFilters = {}): Promise<DirectoryEntry[]> {
  await simulateRequest()
  const db = readDb()
  let list = creatives
    .filter((c) => !filters.craft || filters.craft === 'all' || c.craft === filters.craft)
    .filter((c) => !filters.city || c.city === filters.city)
    .filter((c) => matchesQuery(c, filters.q ?? ''))
    .map<DirectoryEntry>((creative) => ({
      creative,
      fromPrice: Math.min(...creative.services.map((s) => s.price)),
      rating: ratingOf(creative),
      reviewCount: creative.reviews.length,
      next: nextOpening(db, creative, 21),
    }))
    .filter((e) => !filters.maxPrice || e.fromPrice <= filters.maxPrice)

  if (filters.thisWeek) {
    const weekOut = lagosNow().date
    list = list.filter((e) => e.next && e.next.date <= addDays(weekOut, 6))
  }

  const sort = filters.sort ?? 'soonest'
  const soonestKey = (e: DirectoryEntry) => (e.next ? `${e.next.date}-${String(e.next.start).padStart(4, '0')}` : 'z')
  list.sort((a, b) => {
    if (sort === 'rating') return b.rating - a.rating || b.reviewCount - a.reviewCount
    if (sort === 'price') return a.fromPrice - b.fromPrice
    return soonestKey(a).localeCompare(soonestKey(b))
  })
  return list
}

export async function getCreative(slug: string) {
  await simulateRequest()
  const creative = findCreative(slug)
  if (!creative) throw new ApiError('not-found', 'We couldn’t find that creative.')
  return creative
}

/* ---------- availability ---------- */

export interface Availability {
  from: DateKey
  days: { date: DateKey; slots: number[] }[]
}

export async function getAvailability(
  creativeId: string,
  serviceId: string,
  opts: { ignoreBookingId?: string } = {},
): Promise<Availability> {
  await simulateRequest()
  const creative = requireCreative(creativeId)
  const service = requireService(creative, serviceId)
  const db = readDb()
  const from = lagosNow().date
  const map = slotsForRange({
    ...slotQuery(creative, service, busyFor(db, creative.id, { ...opts, ignoreOwnHolds: true })),
    from,
    days: BOOKING_WINDOW_DAYS,
  })
  return { from, days: [...map].map(([date, slots]) => ({ date, slots })) }
}

/* ---------- holds and bookings ---------- */

function explainClash(db: Database, creative: Creative, service: Service, date: DateKey, start: number): never {
  const me = tabId()
  const end = start + service.durationMins
  const heldElsewhere = db.holds.some(
    (h) => h.creativeId === creative.id && h.tabId !== me && h.date === date && h.start < end + creative.bufferMins && start < h.end + creative.bufferMins,
  )
  if (heldElsewhere) {
    throw new ApiError(
      'slot-held',
      'Someone is checking out this time right now, possibly you in another tab. It frees up in a few minutes if they don’t finish.',
    )
  }
  throw new ApiError('slot-taken', 'That time was just booked by someone else. Pick another slot.')
}

export async function holdSlot(input: { creativeId: string; serviceId: string; date: DateKey; start: number }): Promise<Hold> {
  await simulateRequest()
  const creative = requireCreative(input.creativeId)
  const service = requireService(creative, input.serviceId)
  return transact((db) => {
    const me = tabId()
    db.holds = db.holds.filter((h) => h.tabId !== me)
    const q = { ...slotQuery(creative, service, busyFor(db, creative.id)), date: input.date }
    if (!canStartAt(q, input.start)) explainClash(db, creative, service, input.date, input.start)
    const hold: Hold = {
      id: uid('hold'),
      creativeId: creative.id,
      serviceId: service.id,
      date: input.date,
      start: input.start,
      end: input.start + service.durationMins,
      tabId: me,
      expiresAt: Date.now() + holdDurationMs(),
    }
    db.holds.push(hold)
    return { result: hold }
  })
}

export async function releaseHold(holdId: string) {
  await transact((db) => {
    db.holds = db.holds.filter((h) => h.id !== holdId)
    return { result: undefined }
  })
}

export type PaymentInput =
  | { method: 'card'; number: string }
  | { method: 'transfer' }

export async function confirmBooking(input: { holdId: string; client: ClientDetails; payment: PaymentInput }): Promise<Booking> {
  await simulateRequest()
  const ref = bookingRef()
  if (input.payment.method === 'card') {
    const charge = simulateCharge(input.payment.number, ref)
    if (!charge.ok) throw new ApiError('payment-failed', charge.message)
  }
  return transact((db) => {
    const hold = db.holds.find((h) => h.id === input.holdId && h.tabId === tabId())
    if (!hold) {
      throw new ApiError('hold-expired', 'Your 10 minute hold ran out before payment went through, so the slot was released. You haven’t been charged.')
    }
    const creative = requireCreative(hold.creativeId)
    const service = requireService(creative, hold.serviceId)
    const now = new Date().toISOString()
    const booking: Booking = {
      id: uid('bk'),
      ref,
      creativeId: creative.id,
      serviceId: service.id,
      date: hold.date,
      start: hold.start,
      end: hold.end,
      clientId: clientId(),
      client: input.client,
      price: service.price,
      deposit: depositFor(creative, service),
      paidWith: input.payment.method,
      cardLast4: input.payment.method === 'card' ? digitsOnly(input.payment.number).slice(-4) : undefined,
      status: 'confirmed',
      rescheduledCount: 0,
      createdAt: now,
      history: [{ at: now, type: 'booked' }],
    }
    db.holds = db.holds.filter((h) => h.id !== hold.id)
    db.bookings.push(booking)
    return { result: booking, events: [{ type: 'booking-created', bookingId: booking.id, creativeId: creative.id }] }
  })
}

export const bookingStart = (b: Pick<Booking, 'date' | 'start'>) => toInstant(b.date, b.start)

/** Past confirmed bookings read as completed without anyone marking them. */
export function effectiveStatus(b: Booking, now = new Date()) {
  if (b.status === 'confirmed' && toInstant(b.date, b.end) < now) return 'completed'
  return b.status
}

export async function listMyBookings(): Promise<Booking[]> {
  await simulateRequest()
  const me = clientId()
  return readDb()
    .bookings.filter((b) => b.clientId === me)
    .sort((a, b) => bookingStart(a).getTime() - bookingStart(b).getTime())
}

export async function getBooking(id: string): Promise<Booking> {
  await simulateRequest()
  const b = readDb().bookings.find((x) => x.id === id && x.clientId === clientId())
  if (!b) throw new ApiError('not-found', 'We couldn’t find that booking.')
  return b
}

export function previewCancellation(b: Booking): CancelOutcome {
  const creative = requireCreative(b.creativeId)
  return cancellationOutcome({ startsAt: bookingStart(b), now: new Date(), deposit: b.deposit, freeCancelHours: creative.freeCancelHours })
}

export async function cancelBooking(id: string): Promise<Booking> {
  await simulateRequest()
  return transact((db) => {
    const b = db.bookings.find((x) => x.id === id && x.clientId === clientId())
    if (!b) throw new ApiError('not-found', 'We couldn’t find that booking.')
    if (b.status !== 'confirmed' || bookingStart(b) <= new Date()) {
      throw new ApiError('not-allowed', 'This booking can’t be cancelled any more.')
    }
    const outcome = previewCancellation(b)
    b.status = 'cancelled'
    b.refund = outcome.refund
    b.history.push({ at: new Date().toISOString(), type: 'cancelled' })
    return { result: { ...b }, events: [{ type: 'booking-cancelled', bookingId: b.id, creativeId: b.creativeId }] }
  })
}

export async function rescheduleBooking(id: string, date: DateKey, start: number): Promise<Booking> {
  await simulateRequest()
  return transact((db) => {
    const b = db.bookings.find((x) => x.id === id && x.clientId === clientId())
    if (!b) throw new ApiError('not-found', 'We couldn’t find that booking.')
    const creative = requireCreative(b.creativeId)
    const service = requireService(creative, b.serviceId)
    const block = rescheduleBlock({
      startsAt: bookingStart(b),
      now: new Date(),
      freeCancelHours: creative.freeCancelHours,
      timesRescheduled: b.rescheduledCount,
    })
    if (b.status !== 'confirmed' || block) throw new ApiError('not-allowed', 'This booking can’t be moved any more.')
    const q = { ...slotQuery(creative, service, busyFor(db, creative.id, { ignoreBookingId: b.id })), date }
    if (!canStartAt(q, start)) explainClash(db, creative, service, date, start)
    b.history.push({ at: new Date().toISOString(), type: 'rescheduled', from: { date: b.date, start: b.start } })
    b.date = date
    b.start = start
    b.end = start + service.durationMins
    b.rescheduledCount += 1
    return { result: { ...b } }
  })
}

/* ---------- studio side ---------- */

export async function listCreativeBookings(creativeId: string, from: DateKey, to: DateKey) {
  await simulateRequest()
  const db = readDb()
  return {
    bookings: db.bookings
      .filter((b) => b.creativeId === creativeId && b.date >= from && b.date <= to)
      .sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start),
    blocks: db.blocks.filter((b) => b.creativeId === creativeId && b.date >= from && b.date <= to),
  }
}

export async function setDayOff(creativeId: string, date: DateKey, off: boolean) {
  await simulateRequest()
  return transact((db) => {
    db.blocks = db.blocks.filter((b) => !(b.creativeId === creativeId && b.date === date && b.start === 0 && b.end === 1440))
    if (off) {
      const clash = db.bookings.some((b) => b.creativeId === creativeId && b.date === date && b.status === 'confirmed')
      if (clash) throw new ApiError('not-allowed', 'You already have bookings that day. Move or cancel them first.')
      const block: Block = { id: uid('blk'), creativeId, date, start: 0, end: 1440, note: 'Day off' }
      db.blocks.push(block)
    }
    return { result: undefined }
  })
}

export async function markAttendance(bookingId: string, status: 'completed' | 'no-show') {
  await simulateRequest()
  return transact((db) => {
    const b = db.bookings.find((x) => x.id === bookingId)
    if (!b) throw new ApiError('not-found', 'Booking not found.')
    b.status = status
    b.history.push({ at: new Date().toISOString(), type: status })
    return { result: { ...b } }
  })
}
