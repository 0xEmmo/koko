import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { bookingStart, effectiveStatus, getBooking, listMyBookings } from '../../api/client'
import type { Booking } from '../../api/types'
import { isApiError } from '../../api/types'
import { Icon } from '../../components/Icon'
import { Photo } from '../../components/Photo'
import { EmptyState, ErrorState, Skeleton } from '../../components/States'
import { findCreative, findService } from '../../data/creatives'
import { useResource } from '../../hooks/useResource'
import { formatNaira } from '../../lib/money'
import { formatClock, formatDateLong, lagosNow, relativeDay } from '../../lib/time'
import { NotFound } from '../NotFoundPage'
import { BookingDetail } from './BookingDetail'
import { statusLabel } from './status'
import styles from './BookingsPage.module.css'

export default function BookingsPage() {
  const { id } = useParams()
  return id ? <DetailRoute id={id} /> : <ListRoute />
}

function DetailRoute({ id }: { id: string }) {
  const [params] = useSearchParams()
  const res = useResource(() => getBooking(id), [id], { live: true })
  if (res.status === 'error' && !res.data) {
    if (isApiError(res.error, 'not-found')) return <NotFound what="booking" />
    return (
      <div className="page" style={{ paddingBlock: '2rem' }}>
        <ErrorState error={res.error} onRetry={res.retry} />
      </div>
    )
  }
  if (!res.data) {
    return (
      <div className="page" style={{ paddingBlock: '2rem', display: 'grid', gap: '1rem' }} aria-busy="true">
        <Skeleton height={56} width="55%" />
        <Skeleton height={220} radius={8} />
      </div>
    )
  }
  return <BookingDetail booking={res.data} isNew={params.get('new') === '1'} onChanged={res.refresh} />
}

type Tab = 'upcoming' | 'past'

function ListRoute() {
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('tab') === 'past' ? 'past' : 'upcoming'
  const res = useResource(listMyBookings, [], { live: true })

  useEffect(() => {
    document.title = 'My bookings · Kòkó'
  }, [])

  const [now] = useState(() => new Date())
  const upcoming = res.data?.filter((b) => effectiveStatus(b, now) === 'confirmed') ?? []
  const past = (res.data?.filter((b) => effectiveStatus(b, now) !== 'confirmed') ?? []).reverse()
  const list = tab === 'upcoming' ? upcoming : past

  const setTab = (t: Tab) => setParams(t === 'past' ? { tab: 'past' } : {}, { replace: true })

  return (
    <div className={`page ${styles.page}`}>
      <header className={styles.head}>
        <h1 className={styles.title}>My bookings</h1>
        <div className={styles.tabs} role="tablist" aria-label="Bookings">
          <TabButton id="upcoming" current={tab} onSelect={setTab} count={upcoming.length} label="Upcoming" />
          <TabButton id="past" current={tab} onSelect={setTab} count={past.length} label="Past and cancelled" />
        </div>
      </header>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} tabIndex={0} className={styles.panel}>
        {res.status === 'error' && !res.data && <ErrorState error={res.error} onRetry={res.retry} />}
        {!res.data && res.status === 'loading' && (
          <div className={styles.list} aria-busy="true">
            {[0, 1].map((i) => (
              <Skeleton key={i} height={120} radius={8} />
            ))}
          </div>
        )}
        {res.data && list.length === 0 && (
          <EmptyState
            title={tab === 'upcoming' ? 'Nothing booked yet' : 'No past bookings'}
            action={
              <Link to="/" className="btn">
                Find someone to book
              </Link>
            }
          >
            {tab === 'upcoming' ? 'When you book a creative, it shows up here with everything you need on the day.' : undefined}
          </EmptyState>
        )}
        {list.length > 0 && (
          <ul className={styles.list}>
            {list.map((b) => (
              <BookingRow key={b.id} booking={b} now={now} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function TabButton({ id, current, onSelect, count, label }: { id: Tab; current: Tab; onSelect: (t: Tab) => void; count: number; label: string }) {
  return (
    <button
      type="button"
      role="tab"
      id={`tab-${id}`}
      aria-selected={current === id}
      aria-controls={`panel-${id}`}
      tabIndex={current === id ? 0 : -1}
      className={styles.tab}
      onClick={() => onSelect(id)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          const next = id === 'upcoming' ? 'past' : 'upcoming'
          onSelect(next)
          requestAnimationFrame(() => document.getElementById(`tab-${next}`)?.focus())
        }
      }}
    >
      {label} <span className={`num ${styles.tabCount}`}>{count}</span>
    </button>
  )
}

function BookingRow({ booking, now }: { booking: Booking; now: Date }) {
  const creative = findCreative(booking.creativeId)!
  const service = findService(creative, booking.serviceId)!
  const status = statusLabel[effectiveStatus(booking, now)]!
  const today = lagosNow().date
  const soon = effectiveStatus(booking, now) === 'confirmed' && bookingStart(booking).getTime() - now.getTime() < 36 * 3_600_000

  return (
    <li className={styles.row}>
      <Photo name={creative.gallery[0]!.photo} alt="" ratio={1} sizes="96px" className={styles.thumb} />
      <div className={styles.rowBody}>
        <p className={styles.when}>
          <span className={styles.wide}>{formatDateLong(booking.date)}</span>
          <span className={styles.narrow}>{relativeDay(booking.date, today)}</span>
          {' · '}
          <span className="num">{formatClock(booking.start)}</span>
          {soon && <span className={`pill pill-warn ${styles.soon}`}>Soon</span>}
        </p>
        <h2 className={styles.rowTitle}>
          <Link to={`/bookings/${booking.id}`} className={styles.rowLink}>
            {service.name}
          </Link>
        </h2>
        <p className={styles.with}>with {creative.name}</p>
      </div>
      <div className={styles.rowSide}>
        <span className={`pill ${status.tone}`}>{status.text}</span>
        <span className={`num ${styles.paid}`}>
          {booking.status === 'cancelled'
            ? booking.refund
              ? `${formatNaira(booking.refund)} refunded`
              : 'Deposit kept'
            : `${formatNaira(booking.deposit)} paid`}
        </span>
        <Icon name="right" size={18} className={styles.chev} />
      </div>
    </li>
  )
}
