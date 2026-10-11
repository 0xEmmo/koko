import type { Creative, Service } from '../data/types'

/** Deposits are rounded to the nearest ₦500 so they look like real prices. */
export function depositFor(creative: Pick<Creative, 'depositPercent'>, service: Pick<Service, 'price' | 'deposit'>) {
  if (service.deposit !== undefined) return service.deposit
  return Math.round((service.price * creative.depositPercent) / 100 / 500) * 500
}

export const MAX_RESCHEDULES = 2

export interface CancelOutcome {
  /** Inside the creative's notice period, so the deposit is kept. */
  late: boolean
  refund: number
  hoursUntilStart: number
}

export function cancellationOutcome(opts: {
  startsAt: Date
  now: Date
  deposit: number
  freeCancelHours: number
}): CancelOutcome {
  const hoursUntilStart = (opts.startsAt.getTime() - opts.now.getTime()) / 3_600_000
  const late = hoursUntilStart < opts.freeCancelHours
  return { late, refund: late ? 0 : opts.deposit, hoursUntilStart }
}

export type RescheduleBlock = 'started' | 'too-late' | 'limit' | null

export function rescheduleBlock(opts: {
  startsAt: Date
  now: Date
  freeCancelHours: number
  timesRescheduled: number
}): RescheduleBlock {
  const hours = (opts.startsAt.getTime() - opts.now.getTime()) / 3_600_000
  if (hours <= 0) return 'started'
  if (opts.timesRescheduled >= MAX_RESCHEDULES) return 'limit'
  if (hours < opts.freeCancelHours) return 'too-late'
  return null
}

/** "72 hours" reads oddly for a week; say what a person would say. */
export function describeNotice(hours: number) {
  if (hours >= 48 && hours % 24 === 0) {
    const days = hours / 24
    return days === 7 ? 'one week' : `${days} days`
  }
  return hours === 1 ? '1 hour' : `${hours} hours`
}
