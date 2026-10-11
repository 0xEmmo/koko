import { describe, expect, it } from 'vitest'
import { bookingToIcs } from './ics'

describe('bookingToIcs', () => {
  const ics = bookingToIcs({
    uid: 'bk_1',
    title: 'Skin fade with Kay',
    description: 'Ref KK-7Q4M2\nBalance ₦9,500 on the day',
    location: 'Kay Cuts, Yaba, Lagos',
    date: '2026-10-16',
    start: 10 * 60,
    end: 10 * 60 + 45,
    now: new Date('2026-10-11T12:00:00Z'),
  })

  it('writes start and end in UTC', () => {
    expect(ics).toContain('DTSTART:20261016T090000Z')
    expect(ics).toContain('DTEND:20261016T094500Z')
  })

  it('escapes commas, semicolons and newlines', () => {
    expect(ics).toContain('LOCATION:Kay Cuts\\, Yaba\\, Lagos')
    expect(ics).toContain('DESCRIPTION:Ref KK-7Q4M2\\nBalance ₦9\\,500 on the day')
  })

  it('uses CRLF line endings and a reminder', () => {
    expect(ics.split('\r\n')[0]).toBe('BEGIN:VCALENDAR')
    expect(ics).toContain('TRIGGER:-PT2H')
  })

  it('folds long lines', () => {
    const long = bookingToIcs({ uid: 'x', title: 'A'.repeat(120), description: '', location: '', date: '2026-10-16', start: 0, end: 60 })
    const summary = long.split('\r\n').findIndex((l) => l.startsWith('SUMMARY:'))
    expect(long.split('\r\n')[summary]!.length).toBe(74)
    expect(long.split('\r\n')[summary + 1]!.startsWith(' ')).toBe(true)
  })
})
