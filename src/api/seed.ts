import { creatives } from '../data/creatives'
import type { Creative } from '../data/types'
import { canStartAt, stepFor } from '../lib/availability'
import { depositFor } from '../lib/policy'
import { addDays, weekday, type DateKey } from '../lib/time'
import { bookingRef, hashString, mulberry32 } from './random'
import type { Block, Booking, Database } from './types'

const FIRST_NAMES = ['Adaeze', 'Tunde', 'Ngozi', 'Ibrahim', 'Funke', 'Chidi', 'Aisha', 'Segun', 'Bimpe', 'Emeka', 'Hadiza', 'Kelechi', 'Yemi', 'Uche', 'Sola', 'Zainab', 'Femi', 'Ronke', 'Obinna', 'Halima', 'Tolu', 'Nneka', 'Gbenga', 'Amina']
const LAST_INITIALS = 'ABDEFIKLMNOSTUY'

/** Roughly how full each kind of diary is. */
const BUSYNESS: Record<Creative['craft'], number> = {
  barbering: 0.5,
  hair: 0.35,
  makeup: 0.3,
  photography: 0.25,
}

export const DEMO_CLIENT_ID = 'demo-client'

function seedCreativeDay(creative: Creative, date: DateKey, today: DateKey, taken: Booking[]): Booking[] {
  const rand = mulberry32(hashString(creative.id + date))
  const spans = creative.hours[weekday(date)] ?? []
  const isWeekend = weekday(date) === 6 || weekday(date) === 0
  const chance = BUSYNESS[creative.craft] * (isWeekend ? 1.5 : 1)
  const out: Booking[] = []
  // Even busy people have the odd empty weekday; it also gives the studio demo a day to block off.
  if (!isWeekend && rand() < 0.2) return out

  for (const [open, close] of spans) {
    for (let t = open; t < close; t += 30) {
      if (rand() > chance / 2) continue
      const service = creative.services[Math.floor(rand() * creative.services.length)]!
      const start = Math.ceil(t / stepFor(service.durationMins)) * stepFor(service.durationMins)
      const ok = canStartAt(
        {
          date,
          hours: creative.hours,
          durationMins: service.durationMins,
          bufferMins: creative.bufferMins,
          busy: [...taken, ...out],
          now: { date: addDays(today, -60), minutes: 0 },
          leadTimeHours: 0,
        },
        start,
      )
      if (!ok) continue
      const first = FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)]!
      const initial = LAST_INITIALS[Math.floor(rand() * LAST_INITIALS.length)]!
      out.push({
        id: `seed_${creative.id}_${date}_${start}`,
        ref: bookingRef(rand),
        creativeId: creative.id,
        serviceId: service.id,
        date,
        start,
        end: start + service.durationMins,
        clientId: 'someone-else',
        client: { name: `${first} ${initial}.`, phone: '+2348030000000', email: '', notes: '' },
        price: service.price,
        deposit: depositFor(creative, service),
        paidWith: rand() > 0.4 ? 'card' : 'transfer',
        status: date < today && rand() < 0.06 ? 'no-show' : 'confirmed',
        rescheduledCount: 0,
        createdAt: `${addDays(date, -7)}T12:00:00+01:00`,
        history: [],
      })
      t = start + service.durationMins + creative.bufferMins - 30
    }
  }
  return out
}

/** A couple of bookings that belong to "you", so My bookings isn’t empty on first visit. */
function seedOwnBookings(today: DateKey, rand: () => number): Booking[] {
  const kay = creatives.find((c) => c.id === 'cr_kay')!
  const halima = creatives.find((c) => c.id === 'cr_halima')!
  const fade = kay.services[1]!
  const retwist = halima.services[1]!
  const you = { name: 'Emmanuel B.', phone: '+2348031234567', email: 'you@example.com', notes: '' }
  const past = addDays(today, -12)
  const ahead = addDays(today, 9)
  return [
    {
      id: 'seed_you_past',
      ref: bookingRef(rand),
      creativeId: kay.id,
      serviceId: fade.id,
      date: past,
      start: 11 * 60,
      end: 11 * 60 + fade.durationMins,
      clientId: DEMO_CLIENT_ID,
      client: you,
      price: fade.price,
      deposit: depositFor(kay, fade),
      paidWith: 'card',
      cardLast4: '4081',
      status: 'completed',
      rescheduledCount: 0,
      createdAt: `${addDays(past, -2)}T19:42:00+01:00`,
      history: [{ at: `${addDays(past, -2)}T19:42:00+01:00`, type: 'booked' }],
    },
    {
      id: 'seed_you_next',
      ref: bookingRef(rand),
      creativeId: halima.id,
      serviceId: retwist.id,
      date: ahead,
      start: 10 * 60,
      end: 10 * 60 + retwist.durationMins,
      clientId: DEMO_CLIENT_ID,
      client: { ...you, notes: 'Shoulder-length locs, would like a simple barrel updo.' },
      price: retwist.price,
      deposit: depositFor(halima, retwist),
      paidWith: 'transfer',
      status: 'confirmed',
      rescheduledCount: 0,
      createdAt: `${addDays(today, -3)}T08:15:00+01:00`,
      history: [{ at: `${addDays(today, -3)}T08:15:00+01:00`, type: 'booked' }],
    },
  ]
}

export function seedDatabase(today: DateKey): Database {
  const own = seedOwnBookings(today, mulberry32(hashString(today)))
  const bookings: Booking[] = [...own]
  for (const creative of creatives) {
    for (let i = -21; i <= 42; i++) {
      const date = addDays(today, i)
      const taken = bookings.filter((b) => b.creativeId === creative.id && b.date === date)
      bookings.push(...seedCreativeDay(creative, date, today, taken))
    }
  }

  // Zainab's Saturdays go months in advance. Make the next three look like it.
  const zainab = creatives.find((c) => c.id === 'cr_zainab')!
  const blocks: Block[] = []
  for (let i = 0, found = 0; i < 28 && found < 3; i++) {
    const date = addDays(today, i)
    if (weekday(date) !== 6) continue
    found++
    blocks.push({ id: `seed_block_${date}`, creativeId: zainab.id, date, start: 0, end: 1440, note: 'Wedding (booked privately)' })
  }

  return { version: 1, seededOn: today, bookings, holds: [], blocks }
}
