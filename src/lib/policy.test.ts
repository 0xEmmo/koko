import { describe, expect, it } from 'vitest'
import { cancellationOutcome, depositFor, describeNotice, rescheduleBlock } from './policy'

describe('depositFor', () => {
  it('takes the percentage and rounds to ₦500', () => {
    expect(depositFor({ depositPercent: 30 }, { price: 70_000 })).toBe(21_000)
    expect(depositFor({ depositPercent: 20 }, { price: 12_000 })).toBe(2_500)
    expect(depositFor({ depositPercent: 25 }, { price: 10_000 })).toBe(2_500)
  })

  it('prefers a fixed deposit when the service has one', () => {
    expect(depositFor({ depositPercent: 50 }, { price: 45_000, deposit: 15_000 })).toBe(15_000)
  })
})

describe('cancellationOutcome', () => {
  const startsAt = new Date('2026-10-20T09:00:00Z')

  it('refunds the deposit outside the notice period', () => {
    const now = new Date('2026-10-18T08:00:00Z')
    expect(cancellationOutcome({ startsAt, now, deposit: 20_000, freeCancelHours: 24 })).toEqual({
      late: false,
      refund: 20_000,
      hoursUntilStart: 49,
    })
  })

  it('keeps the deposit inside it', () => {
    const now = new Date('2026-10-19T12:00:00Z')
    const out = cancellationOutcome({ startsAt, now, deposit: 20_000, freeCancelHours: 24 })
    expect(out.late).toBe(true)
    expect(out.refund).toBe(0)
  })

  it('treats exactly the notice period as on time', () => {
    const now = new Date('2026-10-19T09:00:00Z')
    expect(cancellationOutcome({ startsAt, now, deposit: 5_000, freeCancelHours: 24 }).late).toBe(false)
  })
})

describe('rescheduleBlock', () => {
  const startsAt = new Date('2026-10-20T09:00:00Z')
  const early = new Date('2026-10-15T09:00:00Z')

  it('allows moving a booking with enough notice', () => {
    expect(rescheduleBlock({ startsAt, now: early, freeCancelHours: 24, timesRescheduled: 0 })).toBeNull()
  })

  it('stops after two moves', () => {
    expect(rescheduleBlock({ startsAt, now: early, freeCancelHours: 24, timesRescheduled: 2 })).toBe('limit')
  })

  it('stops inside the notice period and after the start', () => {
    expect(
      rescheduleBlock({ startsAt, now: new Date('2026-10-20T01:00:00Z'), freeCancelHours: 24, timesRescheduled: 0 }),
    ).toBe('too-late')
    expect(
      rescheduleBlock({ startsAt, now: new Date('2026-10-20T10:00:00Z'), freeCancelHours: 24, timesRescheduled: 0 }),
    ).toBe('started')
  })
})

describe('describeNotice', () => {
  it('uses days for whole multiples of a day', () => {
    expect(describeNotice(4)).toBe('4 hours')
    expect(describeNotice(24)).toBe('24 hours')
    expect(describeNotice(72)).toBe('3 days')
    expect(describeNotice(168)).toBe('one week')
  })
})
