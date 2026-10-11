import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { bookingStart, cancelBooking, effectiveStatus, previewCancellation, rescheduleBooking } from '../../api/client'
import type { Booking } from '../../api/types'
import { Dialog } from '../../components/Dialog'
import { Icon } from '../../components/Icon'
import { Photo } from '../../components/Photo'
import { TimePicker, type TimeValue } from '../../components/TimePicker'
import { useToast } from '../../components/toast'
import { findCreative, findService, firstNameOf } from '../../data/creatives'
import { bookingToIcs, downloadIcs } from '../../lib/ics'
import { formatNaira } from '../../lib/money'
import { formatNigerianPhone } from '../../lib/phone'
import { MAX_RESCHEDULES, describeNotice, rescheduleBlock } from '../../lib/policy'
import { formatClock, formatDateLong, formatDuration } from '../../lib/time'
import { statusLabel } from './status'
import styles from './BookingsPage.module.css'

interface Props {
  booking: Booking
  isNew: boolean
  onChanged: () => void
}

export function BookingDetail({ booking, isNew, onChanged }: Props) {
  const creative = findCreative(booking.creativeId)!
  const service = findService(creative, booking.serviceId)!
  const toast = useToast()
  const [dialog, setDialog] = useState<'cancel' | 'move' | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const status = effectiveStatus(booking)
  const label = statusLabel[status]
  const now = new Date()
  const upcoming = status === 'confirmed'
  const moveBlock = rescheduleBlock({
    startsAt: bookingStart(booking),
    now,
    freeCancelHours: creative.freeCancelHours,
    timesRescheduled: booking.rescheduledCount,
  })
  const firstName = firstNameOf(creative)

  useEffect(() => {
    document.title = `${service.name} with ${creative.name} · Kòkó`
    if (isNew) headingRef.current?.focus()
  }, [service, creative, isNew])

  const addToCalendar = () => {
    const ics = bookingToIcs({
      uid: booking.id,
      title: `${service.name} with ${creative.name}`,
      description: `Kòkó booking ${booking.ref}\nDeposit paid: ${formatNaira(booking.deposit)}\nBalance on the day: ${formatNaira(booking.price - booking.deposit)}`,
      location: `${creative.area}, ${creative.city}`,
      date: booking.date,
      start: booking.start,
      end: booking.end,
    })
    downloadIcs(`koko-${booking.ref}.ics`, ics)
  }

  return (
    <div className={`page ${styles.detail}`}>
      <Link to="/bookings" className={styles.back}>
        <Icon name="left" size={16} /> My bookings
      </Link>

      {isNew && upcoming && (
        <div className={styles.confirmed}>
          <p className="eyebrow">Reference {booking.ref}</p>
          <h1 ref={headingRef} tabIndex={-1} className={styles.confirmedTitle}>
            You’re booked with {firstName}.
          </h1>
          <p>
            We’ve sent the details to {booking.client.email}. {firstName} will message you on {formatNigerianPhone(booking.client.phone)} the day before.
          </p>
        </div>
      )}

      <div className={styles.detailGrid}>
        <section className={styles.card} aria-labelledby="detail-title">
          <div className={styles.cardTop}>
            <span className={`pill ${label.tone}`}>{label.text}</span>
            <span className={`num ${styles.ref}`}>{booking.ref}</span>
          </div>
          {isNew && upcoming ? (
            <h2 id="detail-title" className={styles.detailTitle}>
              {service.name}
            </h2>
          ) : (
            <h1 id="detail-title" className={styles.detailTitle}>
              {service.name}
            </h1>
          )}
          <p className={styles.bigWhen}>
            {formatDateLong(booking.date)}
            <br />
            <span className="num">
              {formatClock(booking.start)} – {formatClock(booking.end)}
            </span>{' '}
            <span className={styles.muted}>({formatDuration(service.durationMins)})</span>
          </p>

          <dl className={styles.facts}>
            <div>
              <dt>Where</dt>
              <dd>
                {service.location === 'home' ? 'Your address (shared on WhatsApp)' : service.location === 'on-location' ? 'Your venue' : `${firstName}’s studio, ${creative.area}`}
              </dd>
            </div>
            <div>
              <dt>Price</dt>
              <dd className="num">{formatNaira(booking.price)}</dd>
            </div>
            <div>
              <dt>Deposit</dt>
              <dd className="num">
                {formatNaira(booking.deposit)} paid by {booking.paidWith === 'card' ? `card ••${booking.cardLast4}` : 'transfer'}
              </dd>
            </div>
            {booking.status === 'cancelled' ? (
              <div>
                <dt>Refund</dt>
                <dd className="num">{booking.refund ? `${formatNaira(booking.refund)}, back in 3–5 working days` : 'None, cancelled inside the notice period'}</dd>
              </div>
            ) : (
              <div>
                <dt>Due on the day</dt>
                <dd className="num">{formatNaira(booking.price - booking.deposit)}</dd>
              </div>
            )}
            {booking.client.notes && (
              <div>
                <dt>Your notes</dt>
                <dd>{booking.client.notes}</dd>
              </div>
            )}
          </dl>

          {upcoming && (
            <div className={styles.detailActions}>
              <button type="button" className="btn" onClick={addToCalendar}>
                <Icon name="download" size={18} /> Add to calendar
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setDialog('move')}
                aria-disabled={moveBlock !== null}
                aria-describedby={moveBlock ? 'move-why' : undefined}
              >
                Reschedule
              </button>
              <button type="button" className="btn btn-quiet" onClick={() => setDialog('cancel')}>
                Cancel booking
              </button>
              {moveBlock && (
                <p id="move-why" className={styles.why}>
                  {moveBlock === 'limit'
                    ? `This booking has already been moved ${MAX_RESCHEDULES} times.`
                    : `It’s less than ${describeNotice(creative.freeCancelHours)} away, so it can’t be moved here. Message ${firstName} directly.`}
                </p>
              )}
            </div>
          )}

          {!upcoming && (
            <div className={styles.detailActions}>
              <Link to={`/c/${creative.slug}/book?service=${service.id}`} className="btn">
                Book again
              </Link>
            </div>
          )}
        </section>

        <aside className={styles.side}>
          <Link to={`/c/${creative.slug}`} className={styles.creative}>
            <Photo name={creative.gallery[1]?.photo ?? creative.avatar} alt="" ratio={4 / 3} sizes="(min-width: 900px) 360px, 92vw" />
            <span className={styles.creativeText}>
              <Photo name={creative.avatar} alt="" ratio={1} sizes="44px" className={styles.creativeAvatar} />
              <span>
                <strong>{creative.name}</strong>
                <span className={styles.muted}>{creative.headline}</span>
              </span>
            </span>
          </Link>
          <h2 className={styles.historyTitle}>History</h2>
          <ol className={styles.history}>
            {[...booking.history].reverse().map((h, i) => (
              <li key={i}>
                <span className={styles.historyWhat}>
                  {h.type === 'booked' && 'Booked and deposit paid'}
                  {h.type === 'rescheduled' && h.from && `Moved from ${formatDateLong(h.from.date)}, ${formatClock(h.from.start)}`}
                  {h.type === 'cancelled' && 'Cancelled'}
                  {h.type === 'completed' && 'Marked as done'}
                  {h.type === 'no-show' && 'Marked as missed'}
                </span>
                <time className={styles.muted} dateTime={h.at}>
                  {new Date(h.at).toLocaleString('en-GB', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                </time>
              </li>
            ))}
          </ol>
        </aside>
      </div>

      <CancelDialog
        open={dialog === 'cancel'}
        booking={booking}
        onClose={() => setDialog(null)}
        onDone={(b) => {
          setDialog(null)
          toast(b.refund ? `Cancelled. ${formatNaira(b.refund)} is on its way back to you.` : 'Booking cancelled', { tone: 'ok' })
          onChanged()
        }}
      />
      {dialog === 'move' && moveBlock === null && (
        <RescheduleDialog
          booking={booking}
          onClose={() => setDialog(null)}
          onDone={(b) => {
            setDialog(null)
            toast(`Moved to ${formatDateLong(b.date)}, ${formatClock(b.start)}`, { tone: 'ok' })
            onChanged()
          }}
        />
      )}
      {dialog === 'move' && moveBlock !== null && (
        <Dialog open onClose={() => setDialog(null)} title="Can’t move this one">
          <p>
            {moveBlock === 'limit'
              ? `Bookings can be moved up to ${MAX_RESCHEDULES} times.`
              : `${firstName} needs ${describeNotice(creative.freeCancelHours)} notice to move a booking.`}{' '}
            You can still cancel, or message {firstName} to sort it out together.
          </p>
        </Dialog>
      )}
    </div>
  )
}

function CancelDialog({ open, booking, onClose, onDone }: { open: boolean; booking: Booking; onClose: () => void; onDone: (b: Booking) => void }) {
  const creative = findCreative(booking.creativeId)!
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const outcome = open ? previewCancellation(booking) : null

  return (
    <Dialog open={open} onClose={onClose} title="Cancel this booking?">
      {outcome && (
        <div className={styles.dialogBody}>
          {outcome.late ? (
            <p className={styles.warning}>
              It’s less than {describeNotice(creative.freeCancelHours)} away, so your <strong className="num">{formatNaira(booking.deposit)}</strong> deposit won’t be refunded.
            </p>
          ) : (
            <p>
              You’ll get your <strong className="num">{formatNaira(booking.deposit)}</strong> deposit back in full, usually within 3–5 working days.
            </p>
          )}
          <p className={styles.muted}>The slot goes straight back on {firstNameOf(creative)}’s calendar for someone else.</p>
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
          <div className={styles.dialogActions}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Keep booking
            </button>
            <button
              type="button"
              className="btn btn-danger"
              disabled={pending}
              onClick={async () => {
                setPending(true)
                setError(null)
                try {
                  onDone(await cancelBooking(booking.id))
                } catch (e) {
                  setError((e as Error).message)
                } finally {
                  setPending(false)
                }
              }}
            >
              {pending ? 'Cancelling…' : outcome.late ? 'Cancel and lose deposit' : 'Cancel booking'}
            </button>
          </div>
        </div>
      )}
    </Dialog>
  )
}

function RescheduleDialog({ booking, onClose, onDone }: { booking: Booking; onClose: () => void; onDone: (b: Booking) => void }) {
  const creative = findCreative(booking.creativeId)!
  const service = findService(creative, booking.serviceId)!
  const [value, setValue] = useState<TimeValue>({ date: booking.date, start: null })
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const unchanged = value.date === booking.date && value.start === booking.start

  return (
    <Dialog open onClose={onClose} title="Pick a new time" wide>
      <div className={styles.dialogBody}>
        <p className={styles.muted}>
          Currently {formatDateLong(booking.date)} at {formatClock(booking.start)}. Your deposit moves with the booking.
        </p>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <TimePicker
          creativeId={creative.id}
          service={service}
          value={value}
          onChange={(v) => {
            setError(null)
            setValue(v)
          }}
          ignoreBookingId={booking.id}
          onSlotLost={() => setError('That time was just taken. Pick another.')}
        />
        <div className={styles.dialogActions}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Never mind
          </button>
          <button
            type="button"
            className="btn"
            disabled={value.date === null || value.start === null || unchanged || pending}
            onClick={async () => {
              if (value.date === null || value.start === null) return
              setPending(true)
              try {
                onDone(await rescheduleBooking(booking.id, value.date, value.start))
              } catch (e) {
                setError((e as Error).message)
              } finally {
                setPending(false)
              }
            }}
          >
            {pending ? 'Moving…' : value.start !== null ? `Move to ${formatClock(value.start)}` : 'Move booking'}
          </button>
        </div>
      </div>
    </Dialog>
  )
}
