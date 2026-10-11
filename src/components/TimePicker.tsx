import { useEffect, useMemo, useRef } from 'react'
import { getAvailability } from '../api/client'
import type { Service } from '../data/types'
import { useResource } from '../hooks/useResource'
import { formatClock, formatDateLong, lagosNow, type DateKey } from '../lib/time'
import { DatePicker } from './DatePicker'
import { SlotPicker } from './SlotPicker'
import { Skeleton } from './States'
import { ErrorState } from './States'
import styles from './TimePicker.module.css'

export interface TimeValue {
  date: DateKey | null
  start: number | null
}

interface Props {
  creativeId: string
  service: Service
  value: TimeValue
  onChange: (v: TimeValue) => void
  /** When rescheduling, the booking's current slot counts as free. */
  ignoreBookingId?: string
  /** Shown when a slot the user picked disappears because someone else took it. */
  onSlotLost?: (lost: { date: DateKey; start: number }) => void
}

export function TimePicker({ creativeId, service, value, onChange, ignoreBookingId, onSlotLost }: Props) {
  const avail = useResource(() => getAvailability(creativeId, service.id, { ignoreBookingId }), [creativeId, service.id, ignoreBookingId], {
    live: true,
  })

  const counts = useMemo(() => new Map(avail.data?.days.map((d) => [d.date, d.slots.length]) ?? []), [avail.data])
  const slots = avail.data?.days.find((d) => d.date === value.date)?.slots ?? []
  const today = lagosNow().date
  const lostRef = useRef(onSlotLost)
  useEffect(() => {
    lostRef.current = onSlotLost
  })

  // Pick the first day with space so people aren't staring at an empty list.
  useEffect(() => {
    if (!avail.data || value.date) return
    const first = avail.data.days.find((d) => d.slots.length)
    if (first) onChange({ date: first.date, start: null })
  }, [avail.data, value.date, onChange])

  // A live update removed the slot the user had chosen.
  useEffect(() => {
    if (!avail.data || value.date === null || value.start === null) return
    const day = avail.data.days.find((d) => d.date === value.date)
    // a day that filled up entirely may drop out of the response altogether
    if (!day?.slots.includes(value.start)) {
      lostRef.current?.({ date: value.date, start: value.start })
      onChange({ date: value.date, start: null })
    }
  }, [avail.data, value.date, value.start, onChange])

  if (avail.status === 'error' && !avail.data) return <ErrorState error={avail.error} onRetry={avail.retry} />

  const days = avail.data?.days ?? []
  const min = days[0]?.date ?? today
  const max = days.at(-1)?.date ?? today
  const nothingAtAll = avail.data && days.every((d) => d.slots.length === 0)

  if (nothingAtAll) {
    return (
      <p className={styles.none} role="status">
        Nothing free in the next eight weeks for this service. Try another service or check back soon; cancellations
        open up slots most weeks.
      </p>
    )
  }

  return (
    <div className={styles.picker}>
      <div className={styles.calendar}>
        <DatePicker
          value={value.date}
          onChange={(date) => onChange({ date, start: null })}
          slotCounts={counts}
          min={min}
          max={max}
          today={today}
          loading={avail.status === 'loading'}
        />
      </div>
      <div className={styles.times}>
        <h3 className={styles.dayTitle} aria-live="polite">
          {value.date ? formatDateLong(value.date) : 'Pick a day'}
        </h3>
        {!avail.data ? (
          <div className={styles.skeleton} aria-busy="true" aria-label="Loading times">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} height={44} radius={8} />
            ))}
          </div>
        ) : value.date && slots.length === 0 ? (
          <p className={styles.none}>Fully booked that day.</p>
        ) : (
          value.date && (
            <SlotPicker
              slots={slots}
              value={value.start}
              onChange={(start) => onChange({ date: value.date, start })}
              durationMins={service.durationMins}
              label={`Start times on ${formatDateLong(value.date)}`}
            />
          )
        )}
        {value.start !== null && (
          <p className={styles.until}>
            Ends around <span className="num">{formatClock(value.start + service.durationMins)}</span>
          </p>
        )}
      </div>
    </div>
  )
}
