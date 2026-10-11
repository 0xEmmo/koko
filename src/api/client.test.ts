import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { creatives } from '../data/creatives'
import { TEST_CARDS } from '../lib/payment'
import { addDays, lagosNow } from '../lib/time'
import {
  cancelBooking,
  confirmBooking,
  getAvailability,
  holdSlot,
  listCreativeBookings,
  listCreatives,
  listMyBookings,
  rescheduleBooking,
  setDayOff,
} from './client'
import { resetDb } from './db'
import { isApiError } from './types'

const kay = creatives.find((c) => c.slug === 'kay-bankole')!
const fade = kay.services[1]!
const client = { name: 'Ada Okafor', phone: '+2348031234567', email: 'ada@example.com', notes: '' }

const actAsTab = (id: string) => sessionStorage.setItem('koko.tab', id)

async function firstOpenSlot(serviceId = fade.id) {
  const { days } = await getAvailability(kay.id, serviceId)
  const day = days.find((d) => d.slots.length > 0 && d.date > lagosNow().date)!
  return { date: day.date, start: day.slots[0]! }
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  localStorage.setItem('koko.latency', '0')
  resetDb()
  actAsTab('tab_a')
})

afterEach(() => {
  vi.useRealTimers()
})

describe('directory', () => {
  it('filters by craft and search text', async () => {
    const barbers = await listCreatives({ craft: 'barbering' })
    expect(barbers.map((e) => e.creative.craft)).toEqual(['barbering', 'barbering'])
    const braids = await listCreatives({ q: 'knotless' })
    expect(braids.map((e) => e.creative.slug)).toEqual(['amaka-obi'])
  })

  it('filters by city and starting price', async () => {
    const abuja = await listCreatives({ city: 'Abuja' })
    expect(abuja.map((e) => e.creative.slug)).toEqual(['musa-garba'])
    const cheap = await listCreatives({ maxPrice: 10_000 })
    expect(cheap.every((e) => e.fromPrice <= 10_000)).toBe(true)
  })

  it('sorts by rating when asked', async () => {
    const list = await listCreatives({ sort: 'rating' })
    const ratings = list.map((e) => e.rating)
    expect(ratings).toEqual([...ratings].sort((a, b) => b - a))
  })
})

describe('booking a slot', () => {
  it('holds, pays and confirms', async () => {
    const slot = await firstOpenSlot()
    const hold = await holdSlot({ creativeId: kay.id, serviceId: fade.id, ...slot })
    const booking = await confirmBooking({ holdId: hold.id, client, payment: { method: 'card', number: TEST_CARDS.success } })
    expect(booking.ref).toMatch(/^KK-[A-Z2-9]{5}$/)
    expect(booking.cardLast4).toBe('4081')
    expect(booking.deposit).toBe(2_500)

    const { days } = await getAvailability(kay.id, fade.id)
    expect(days.find((d) => d.date === slot.date)!.slots).not.toContain(slot.start)
  })

  it('tells a second tab the slot is being held', async () => {
    const slot = await firstOpenSlot()
    await holdSlot({ creativeId: kay.id, serviceId: fade.id, ...slot })

    actAsTab('tab_b')
    const err = await holdSlot({ creativeId: kay.id, serviceId: fade.id, ...slot }).catch((e) => e)
    expect(isApiError(err, 'slot-held')).toBe(true)
  })

  it('tells a second tab the slot was taken once the first one pays', async () => {
    const slot = await firstOpenSlot()
    const hold = await holdSlot({ creativeId: kay.id, serviceId: fade.id, ...slot })
    await confirmBooking({ holdId: hold.id, client, payment: { method: 'transfer' } })

    actAsTab('tab_b')
    const err = await holdSlot({ creativeId: kay.id, serviceId: fade.id, ...slot }).catch((e) => e)
    expect(isApiError(err, 'slot-taken')).toBe(true)
  })

  it('still shows a tab its own held slot', async () => {
    const slot = await firstOpenSlot()
    await holdSlot({ creativeId: kay.id, serviceId: fade.id, ...slot })
    const { days } = await getAvailability(kay.id, fade.id)
    expect(days.find((d) => d.date === slot.date)!.slots).toContain(slot.start)
  })

  it('refuses to confirm once the hold has expired', async () => {
    localStorage.setItem('koko.holdSeconds', '1')
    const slot = await firstOpenSlot()
    const hold = await holdSlot({ creativeId: kay.id, serviceId: fade.id, ...slot })
    await new Promise((r) => setTimeout(r, 1100))
    const err = await confirmBooking({ holdId: hold.id, client, payment: { method: 'transfer' } }).catch((e) => e)
    expect(isApiError(err, 'hold-expired')).toBe(true)
  })

  it('keeps the hold when the card is declined', async () => {
    const slot = await firstOpenSlot()
    const hold = await holdSlot({ creativeId: kay.id, serviceId: fade.id, ...slot })
    const err = await confirmBooking({ holdId: hold.id, client, payment: { method: 'card', number: TEST_CARDS.declined } }).catch((e) => e)
    expect(isApiError(err, 'payment-failed')).toBe(true)
    const ok = await confirmBooking({ holdId: hold.id, client, payment: { method: 'card', number: TEST_CARDS.success } })
    expect(ok.status).toBe('confirmed')
  })
})

describe('managing a booking', () => {
  async function book() {
    const slot = await firstOpenSlot()
    const hold = await holdSlot({ creativeId: kay.id, serviceId: fade.id, ...slot })
    return confirmBooking({ holdId: hold.id, client, payment: { method: 'transfer' } })
  }

  it('moves a booking to another free slot and frees the old one', async () => {
    const booking = await book()
    const { days } = await getAvailability(kay.id, fade.id, { ignoreBookingId: booking.id })
    const later = days.filter((d) => d.date > booking.date && d.slots.length)[1]!
    const moved = await rescheduleBooking(booking.id, later.date, later.slots[0]!)
    expect(moved.date).toBe(later.date)
    expect(moved.rescheduledCount).toBe(1)
    expect(moved.history.at(-1)).toMatchObject({ type: 'rescheduled', from: { date: booking.date, start: booking.start } })
  })

  it('cancels with a refund when there is enough notice', async () => {
    const booking = await book()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(Date.now() - 2 * 86_400_000))
    const cancelled = await cancelBooking(booking.id)
    expect(cancelled.status).toBe('cancelled')
    expect(cancelled.refund).toBe(booking.deposit)
  })

  it('lists my bookings in date order', async () => {
    await book()
    const mine = await listMyBookings()
    const times = mine.map((b) => `${b.date}${b.start}`)
    expect(times).toEqual([...times].sort())
    expect(mine.length).toBeGreaterThanOrEqual(3)
  })
})

describe('studio', () => {
  it('blocks a free day and gives it back', async () => {
    const date = addDays(lagosNow().date, 50)
    await setDayOff(kay.id, date, true)
    let { days } = await getAvailability(kay.id, fade.id)
    expect(days.find((d) => d.date === date)!.slots).toEqual([])

    await setDayOff(kay.id, date, false)
    ;({ days } = await getAvailability(kay.id, fade.id))
    expect(days.find((d) => d.date === date)!.slots.length).toBeGreaterThan(0)
  })

  it('won’t block a day that already has bookings', async () => {
    const from = addDays(lagosNow().date, 1)
    const { bookings } = await listCreativeBookings(kay.id, from, addDays(from, 14))
    const busyDay = bookings.find((b) => b.status === 'confirmed')!.date
    const err = await setDayOff(kay.id, busyDay, true).catch((e) => e)
    expect(isApiError(err, 'not-allowed')).toBe(true)
  })
})
