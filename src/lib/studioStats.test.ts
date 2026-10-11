import { describe, expect, it } from 'vitest'
import type { Booking } from '../api/types'
import type { WeeklyHours } from '../data/types'
import { greeting, weekStats } from './studioStats'

const hours: WeeklyHours = [[], [[540, 1020]], [[540, 1020]], [[540, 1020]], [[540, 1020]], [[540, 1020]], [[600, 840]]]

const booking = (p: Partial<Booking>): Booking => ({
  id: Math.random().toString(),
  ref: 'KK-AAAAA',
  creativeId: 'c',
  serviceId: 's',
  date: '2026-10-12',
  start: 600,
  end: 660,
  clientId: 'x',
  client: { name: 'A', phone: '', email: '', notes: '' },
  price: 20_000,
  deposit: 5_000,
  paidWith: 'card',
  status: 'confirmed',
  rescheduledCount: 0,
  createdAt: '',
  history: [],
  ...p,
})

describe('weekStats', () => {
  it('adds up confirmed and completed bookings in the range', () => {
    const stats = weekStats({
      bookings: [
        booking({}),
        booking({ date: '2026-10-13', status: 'completed', start: 540, end: 780 }),
        booking({ date: '2026-10-13', status: 'cancelled' }),
        booking({ date: '2026-10-30' }),
      ],
      hours,
      from: '2026-10-12',
      days: 7,
      blockedDays: new Set(),
    })
    expect(stats.bookings).toBe(2)
    expect(stats.depositsCollected).toBe(10_000)
    expect(stats.dueOnTheDay).toBe(30_000)
    // Mon–Fri 8h + Sat 4h = 44h of open time; 5h booked
    expect(stats.openMinutes).toBe(44 * 60)
    expect(stats.occupancy).toBeCloseTo(300 / 2640)
  })

  it('leaves blocked days out of open time', () => {
    const stats = weekStats({ bookings: [], hours, from: '2026-10-12', days: 1, blockedDays: new Set(['2026-10-12']) })
    expect(stats.openMinutes).toBe(0)
    expect(stats.occupancy).toBe(0)
  })
})

describe('greeting', () => {
  it('follows the time of day', () => {
    expect(greeting(9 * 60)).toBe('Good morning')
    expect(greeting(13 * 60)).toBe('Good afternoon')
    expect(greeting(19 * 60)).toBe('Good evening')
  })
})
