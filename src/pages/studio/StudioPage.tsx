import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { listCreativeBookings, markAttendance, setDayOff } from '../../api/client'
import { subscribe } from '../../api/db'
import type { Booking } from '../../api/types'
import { Icon } from '../../components/Icon'
import { Photo } from '../../components/Photo'
import { ErrorState, Skeleton } from '../../components/States'
import { useToast } from '../../components/toast'
import { creatives, findCreative, findService } from '../../data/creatives'
import { useResource } from '../../hooks/useResource'
import { formatNaira, formatNairaShort } from '../../lib/money'
import { greeting, weekStats } from '../../lib/studioStats'
import { addDays, formatClock, formatDateLong, lagosNow, relativeDay, toInstant, weekday, type DateKey } from '../../lib/time'
import styles from './StudioPage.module.css'

const AS_KEY = 'koko.studioAs'
const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function StudioPage() {
  const [asId, setAsId] = useState(() => localStorage.getItem(AS_KEY) ?? 'cr_kay')
  const creative = findCreative(asId) ?? creatives[0]!
  const now = lagosNow()
  const today = now.date
  const [day, setDay] = useState<DateKey>(today)
  const [highlight, setHighlight] = useState<string | null>(null)
  const toast = useToast()
  const res = useResource(() => listCreativeBookings(creative.id, addDays(today, -7), addDays(today, 21)), [creative.id, today], { live: true })

  useEffect(() => {
    document.title = `Studio · ${creative.name} · Kòkó`
  }, [creative])

  // Bookings made in another tab show up here as they happen.
  useEffect(
    () =>
      subscribe((e) => {
        if (e.type !== 'booking-created' || e.creativeId !== creative.id) return
        setHighlight(e.bookingId)
        toast('New booking just came in', { tone: 'ok' })
      }),
    [creative.id, toast],
  )

  const bookings = useMemo(() => res.data?.bookings ?? [], [res.data])
  const blocked = useMemo(
    () => new Set((res.data?.blocks ?? []).filter((b) => b.start === 0 && b.end === 1440).map((b) => b.date)),
    [res.data],
  )
  const stats = weekStats({ bookings, hours: creative.hours, from: today, days: 7, blockedDays: blocked })
  const dayBookings = bookings.filter((b) => b.date === day && b.status !== 'cancelled')
  const firstName = creative.name.split(' ')[0]!

  const switchTo = (id: string) => {
    localStorage.setItem(AS_KEY, id)
    setAsId(id)
    setDay(today)
  }

  const toggleDayOff = async (date: DateKey, off: boolean) => {
    try {
      await setDayOff(creative.id, date, off)
      toast(off ? `${relativeDay(date, today)} blocked off. Clients can’t book it.` : `${relativeDay(date, today)} is open for bookings again`)
    } catch (e) {
      toast((e as Error).message, { tone: 'danger' })
    }
  }

  return (
    <div className={`page ${styles.page}`}>
      <header className={styles.head}>
        <div className={styles.who}>
          <Photo name={creative.avatar} alt="" ratio={1} sizes="64px" className={styles.avatar} />
          <div>
            <p className="eyebrow">Studio · {formatDateLong(today)}</p>
            <h1 className={styles.title}>
              {greeting(now.minutes)}, {firstName}.
            </h1>
          </div>
        </div>
        <div className={styles.switch}>
          <label htmlFor="studio-as">Viewing as</label>
          <select id="studio-as" value={creative.id} onChange={(e) => switchTo(e.target.value)} className="input">
            {creatives.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      {res.status === 'error' && !res.data && <ErrorState error={res.error} onRetry={res.retry} />}

      <section aria-labelledby="week-title" className={styles.statsWrap}>
        <h2 id="week-title" className={styles.sectionTitle}>
          Next 7 days
        </h2>
        <dl className={styles.stats}>
          <Stat label="Bookings" value={res.data ? String(stats.bookings) : null} />
          <Stat label="Deposits in" value={res.data ? formatNairaShort(stats.depositsCollected) : null} title={formatNaira(stats.depositsCollected)} />
          <Stat label="To collect on the day" value={res.data ? formatNairaShort(stats.dueOnTheDay) : null} title={formatNaira(stats.dueOnTheDay)} />
          <Stat label="Diary filled" value={res.data ? `${Math.round(stats.occupancy * 100)}%` : null}>
            <span className={styles.meter} aria-hidden>
              <span style={{ width: `${stats.occupancy * 100}%` }} />
            </span>
          </Stat>
        </dl>
      </section>

      <div className={styles.columns}>
        <section aria-labelledby="agenda-title" className={styles.agenda}>
          <h2 id="agenda-title" className={styles.sectionTitle}>
            Diary
          </h2>
          <div className={styles.days} role="group" aria-label="Choose a day">
            {Array.from({ length: 7 }, (_, i) => {
              const d = addDays(today, i)
              const count = bookings.filter((b) => b.date === d && b.status === 'confirmed').length
              return (
                <button key={d} type="button" className={styles.dayBtn} aria-pressed={d === day} onClick={() => setDay(d)}>
                  <span className={styles.dayName}>{i === 0 ? 'Today' : WEEKDAY[weekday(d)]}</span>
                  <span className={styles.dayNum}>{Number(d.slice(-2))}</span>
                  <span className={styles.dayCount}>
                    {blocked.has(d) ? 'Off' : `${count}`}
                    <span className="sr-only">{blocked.has(d) ? ' day off' : ` bookings`}</span>
                  </span>
                </button>
              )
            })}
          </div>

          {!res.data ? (
            <div className={styles.list}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height={76} radius={8} />
              ))}
            </div>
          ) : blocked.has(day) ? (
            <p className={styles.empty}>Day off. Nobody can book you.</p>
          ) : dayBookings.length === 0 ? (
            <p className={styles.empty}>
              {(creative.hours[weekday(day)] ?? []).length === 0 ? 'You don’t work this day.' : 'Nothing booked yet.'}
            </p>
          ) : (
            <ol className={styles.list}>
              {dayBookings.map((b) => (
                <AgendaItem key={b.id} booking={b} highlight={b.id === highlight} />
              ))}
            </ol>
          )}
        </section>

        <section aria-labelledby="off-title" className={styles.off}>
          <h2 id="off-title" className={styles.sectionTitle}>
            Time off
          </h2>
          <p className={styles.help}>Block a whole day and it disappears from your booking calendar straight away.</p>
          <ul className={styles.offList}>
            {Array.from({ length: 14 }, (_, i) => {
              const d = addDays(today, i + 1)
              const works = (creative.hours[weekday(d)] ?? []).length > 0
              const off = blocked.has(d)
              const booked = bookings.filter((b) => b.date === d && b.status === 'confirmed').length
              const note = res.data?.blocks.find((b) => b.date === d)?.note
              return (
                <li key={d} className={styles.offRow}>
                  <span>
                    <strong>{relativeDay(d, today)}</strong>
                    <span className={styles.muted}>
                      {!works ? 'Closed' : off ? note ?? 'Day off' : booked ? `${booked} booked` : 'Open'}
                    </span>
                  </span>
                  {works && (
                    <label className={styles.switchToggle}>
                      <input
                        type="checkbox"
                        role="switch"
                        checked={off}
                        disabled={!res.data}
                        onChange={(e) => toggleDayOff(d, e.target.checked)}
                        aria-label={`Day off ${formatDateLong(d)}`}
                      />
                      <span aria-hidden />
                    </label>
                  )}
                </li>
              )
            })}
          </ul>
          <p className={styles.help}>
            Want to see a booking arrive live? Open{' '}
            <Link to={`/c/${creative.slug}/book`} target="_blank">
              {firstName}’s booking page
            </Link>{' '}
            in another tab and book something.
          </p>
        </section>
      </div>
    </div>
  )
}

function Stat({ label, value, title, children }: { label: string; value: string | null; title?: string; children?: React.ReactNode }) {
  return (
    <div className={styles.stat}>
      <dt>{label}</dt>
      <dd title={title}>{value ?? <Skeleton height={34} width={80} />}</dd>
      {children}
    </div>
  )
}

function AgendaItem({ booking, highlight }: { booking: Booking; highlight: boolean }) {
  const creative = findCreative(booking.creativeId)!
  const service = findService(creative, booking.serviceId)!
  const toast = useToast()
  const started = toInstant(booking.date, booking.start) < new Date()
  const balance = booking.price - booking.deposit

  return (
    <li className={styles.item} data-highlight={highlight} data-status={booking.status}>
      <p className={`num ${styles.time}`}>
        {formatClock(booking.start)}
        <span>{formatClock(booking.end)}</span>
      </p>
      <div className={styles.itemBody}>
        <p className={styles.client}>{booking.client.name}</p>
        <p className={styles.muted}>
          {service.name} · {formatNaira(balance)} to collect
        </p>
        {booking.client.notes && <p className={styles.note}>“{booking.client.notes}”</p>}
      </div>
      <div className={styles.itemSide}>
        {booking.status === 'confirmed' && started ? (
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => markAttendance(booking.id, 'completed').then(() => toast('Marked as done'))}
            >
              <Icon name="check" size={16} /> Done
            </button>
            <button type="button" className="btn btn-quiet" onClick={() => markAttendance(booking.id, 'no-show').then(() => toast('Marked as missed'))}>
              No-show
            </button>
          </>
        ) : (
          <span className={`pill ${booking.status === 'no-show' ? 'pill-warn' : booking.status === 'completed' ? '' : 'pill-ok'}`}>
            {booking.status === 'no-show' ? 'Missed' : booking.status === 'completed' ? 'Done' : 'Deposit paid'}
          </span>
        )}
      </div>
    </li>
  )
}
