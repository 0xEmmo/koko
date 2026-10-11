import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { confirmBooking, getCreative, holdSlot, releaseHold, type PaymentInput } from '../../api/client'
import { isApiError } from '../../api/types'
import { Icon } from '../../components/Icon'
import { Photo } from '../../components/Photo'
import { RouteFallback } from '../../components/RouteFallback'
import { ErrorState } from '../../components/States'
import { TimePicker, type TimeValue } from '../../components/TimePicker'
import { useToast } from '../../components/Toaster'
import { findService } from '../../data/creatives'
import type { Creative } from '../../data/types'
import { useResource } from '../../hooks/useResource'
import { formatNaira } from '../../lib/money'
import { normaliseNigerianPhone } from '../../lib/phone'
import { depositFor } from '../../lib/policy'
import { formatClock, formatDateLong, formatDateShort, formatDuration } from '../../lib/time'
import { NotFound } from '../NotFoundPage'
import { DetailsForm } from './DetailsForm'
import { PaymentStep } from './PaymentStep'
import { clearDraft, loadDraft, rememberDetails, rememberedDetails, saveDraft, type Draft, type Step } from './draft'
import { formatCountdown, useCountdown } from './useCountdown'
import { validateDetails, type DetailErrors } from './validateDetails'
import styles from './BookingPage.module.css'

const STEPS: { id: Step; label: string }[] = [
  { id: 'service', label: 'Service' },
  { id: 'time', label: 'Time' },
  { id: 'details', label: 'Details' },
  { id: 'pay', label: 'Deposit' },
]

export default function BookingPage() {
  const { slug = '' } = useParams()
  const res = useResource(() => getCreative(slug), [slug])
  if (res.status === 'error') {
    if (isApiError(res.error, 'not-found')) return <NotFound what="creative" />
    return (
      <div className="page" style={{ paddingBlock: '2rem' }}>
        <ErrorState error={res.error} onRetry={res.retry} />
      </div>
    )
  }
  if (!res.data) return <RouteFallback />
  return <Flow creative={res.data} />
}

function initialDraft(creative: Creative, serviceParam: string | null): Draft {
  const saved = loadDraft(creative.slug)
  const fromUrl = serviceParam && findService(creative, serviceParam) ? serviceParam : null
  if (saved && (!fromUrl || saved.serviceId === fromUrl)) return saved
  return {
    step: fromUrl ? 'time' : 'service',
    serviceId: fromUrl,
    date: null,
    start: null,
    hold: null,
    details: rememberedDetails(),
  }
}

function Flow({ creative }: { creative: Creative }) {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [draft, setDraft] = useState<Draft>(() => initialDraft(creative, params.get('service')))
  const [timeError, setTimeError] = useState<string | null>(null)
  const [detailErrors, setDetailErrors] = useState<DetailErrors>({})
  const [busy, setBusy] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const firstRender = useRef(true)
  const heldSlot = useRef(draft.hold ? `${draft.date}-${draft.start}` : '')

  const service = draft.serviceId ? findService(creative, draft.serviceId) ?? null : null
  const deposit = service ? depositFor(creative, service) : 0
  const secondsLeft = useCountdown(draft.hold?.expiresAt ?? null)
  const holdExpired = draft.hold !== null && secondsLeft === 0
  const firstName = creative.name.split(' ')[0]!.replace(/“.*/, '').trim()

  useEffect(() => saveDraft(creative.slug, draft), [creative.slug, draft])

  useEffect(() => {
    document.title = `Book ${creative.name} · Kòkó`
  }, [creative])

  // Move focus to the new step's heading so screen readers announce it.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    headingRef.current?.focus()
  }, [draft.step])

  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }))
  const goTo = (step: Step) => patch({ step })

  const onTimeChange = useCallback((v: TimeValue) => {
    setTimeError(null)
    setDraft((d) => ({ ...d, date: v.date, start: v.start }))
  }, [])

  const chooseService = (id: string) => {
    if (draft.hold) releaseHold(draft.hold.id).catch(() => {})
    setDraft((d) => ({ ...d, serviceId: id, date: null, start: null, hold: null, step: 'time' }))
  }

  const holdAndContinue = async () => {
    if (!service || draft.date === null || draft.start === null) return
    // Already holding exactly this slot (came back from the details step).
    if (draft.hold && !holdExpired && heldSlot.current === `${draft.date}-${draft.start}`) {
      return goTo('details')
    }
    setBusy(true)
    setTimeError(null)
    try {
      const hold = await holdSlot({ creativeId: creative.id, serviceId: service.id, date: draft.date, start: draft.start })
      heldSlot.current = `${hold.date}-${hold.start}`
      patch({ hold: { id: hold.id, expiresAt: hold.expiresAt }, step: 'details' })
    } catch (e) {
      setTimeError((e as Error).message)
      if (isApiError(e, 'slot-taken')) patch({ start: null })
    } finally {
      setBusy(false)
    }
  }
  const submitDetails = () => {
    const errors = validateDetails(draft.details)
    setDetailErrors(errors)
    const first = Object.keys(errors)[0]
    if (first) {
      document.getElementById(`field-${first}`)?.focus()
      return
    }
    const phone = normaliseNigerianPhone(draft.details.phone)!
    const details = { ...draft.details, name: draft.details.name.trim(), phone, email: draft.details.email.trim() }
    rememberDetails(details)
    patch({ details, step: 'pay' })
  }

  const pay = async (payment: PaymentInput) => {
    if (!draft.hold) return
    const booking = await confirmBooking({ holdId: draft.hold.id, client: draft.details, payment })
    clearDraft(creative.slug)
    toast(`Booked with ${firstName}. Reference ${booking.ref}`, { tone: 'ok' })
    navigate(`/bookings/${booking.id}?new=1`, { replace: true })
  }

  const restartTime = () => {
    heldSlot.current = ''
    patch({ hold: null, start: null, step: 'time' })
    setTimeError('Your hold ran out, so the slot went back on sale. Pick a time again.')
  }

  const stepIndex = STEPS.findIndex((s) => s.id === draft.step)
  const canContinueTime = service && draft.date !== null && draft.start !== null

  return (
    <div className={`page ${styles.flow}`}>
      <div className={styles.top}>
        <Link to={`/c/${creative.slug}`} className={styles.back}>
          <Icon name="left" size={16} /> {creative.name}
        </Link>
        <ol className={styles.steps} aria-label="Booking steps">
          {STEPS.map((s, i) => (
            <li key={s.id} aria-current={s.id === draft.step ? 'step' : undefined} data-done={i < stepIndex}>
              <span className={`num ${styles.stepNum}`}>{i < stepIndex ? <Icon name="check" size={14} /> : i + 1}</span>
              <span className={styles.stepLabel}>{s.label}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className={styles.layout}>
        <section className={styles.main} aria-labelledby="step-title">
          {draft.hold && secondsLeft !== null && draft.step !== 'time' && !holdExpired && (
            <p className={styles.hold} data-urgent={secondsLeft < 120} role="timer" aria-live="off">
              <Icon name="clock" size={16} />
              We’re holding {draft.start !== null && formatClock(draft.start)} for you for{' '}
              <strong className="tnum">{formatCountdown(secondsLeft)}</strong>
            </p>
          )}

          {draft.step === 'service' && (
            <>
              <h1 id="step-title" ref={headingRef} tabIndex={-1} className={styles.title}>
                What are you booking?
              </h1>
              <fieldset className={styles.serviceList}>
                <legend className="sr-only">Services</legend>
                {creative.services.map((s) => (
                  <label key={s.id} className={styles.serviceOption}>
                    <input
                      type="radio"
                      name="service"
                      checked={draft.serviceId === s.id}
                      onChange={() => patch({ serviceId: s.id, date: null, start: null })}
                    />
                    <span className={styles.serviceBody}>
                      <span className={styles.serviceName}>{s.name}</span>
                      <span className={styles.serviceMeta}>
                        {formatDuration(s.durationMins)} · {formatNaira(depositFor(creative, s))} deposit
                      </span>
                    </span>
                    <span className={`num ${styles.servicePrice}`}>{formatNaira(s.price)}</span>
                  </label>
                ))}
              </fieldset>
              <div className={styles.actions}>
                <button type="button" className="btn btn-block" disabled={!draft.serviceId} onClick={() => draft.serviceId && chooseService(draft.serviceId)}>
                  Choose a time <Icon name="arrowRight" size={18} />
                </button>
              </div>
            </>
          )}

          {draft.step === 'time' && service && (
            <>
              <h1 id="step-title" ref={headingRef} tabIndex={-1} className={styles.title}>
                When suits you?
              </h1>
              <p className={styles.sub}>
                {service.name} · {formatDuration(service.durationMins)}.{' '}
                <button type="button" className={styles.inlineLink} onClick={() => goTo('service')}>
                  Change service
                </button>
              </p>
              {timeError && (
                <p className={styles.alert} role="alert">
                  <Icon name="alert" size={18} />
                  {timeError}
                </p>
              )}
              <TimePicker
                creativeId={creative.id}
                service={service}
                value={{ date: draft.date, start: draft.start }}
                onChange={onTimeChange}
                onSlotLost={({ start }) =>
                  setTimeError(`Sorry, ${formatClock(start)} was just booked by someone else. Pick another time.`)
                }
              />
              <div className={styles.actions}>
                <button type="button" className="btn btn-block" disabled={!canContinueTime || busy} onClick={holdAndContinue}>
                  {busy ? 'Holding your slot…' : 'Continue'}
                  {!busy && <Icon name="arrowRight" size={18} />}
                </button>
              </div>
            </>
          )}

          {draft.step === 'details' && service && (
            <>
              <h1 id="step-title" ref={headingRef} tabIndex={-1} className={styles.title}>
                Your details
              </h1>
              <p className={styles.sub}>{firstName} will use these to confirm and to reach you on the day.</p>
              <DetailsForm
                value={draft.details}
                errors={detailErrors}
                onChange={(details) => patch({ details })}
                onSubmit={submitDetails}
                notesHint={
                  creative.craft === 'hair'
                    ? 'Length, colour, whether you’re bringing hair…'
                    : creative.craft === 'photography'
                      ? 'Location ideas, how many people, the occasion…'
                      : 'Anything they should know before you arrive'
                }
              />
              <div className={styles.actions}>
                <button type="button" className="btn btn-ghost" onClick={() => goTo('time')}>
                  Back
                </button>
                <button type="submit" form="details-form" className="btn">
                  Continue to deposit <Icon name="arrowRight" size={18} />
                </button>
              </div>
            </>
          )}

          {draft.step === 'pay' && service && (
            <>
              <h1 id="step-title" ref={headingRef} tabIndex={-1} className={styles.title}>
                Pay the deposit
              </h1>
              {holdExpired ? (
                <div className={styles.expired} role="alert">
                  <p className={styles.expiredTitle}>Your hold ran out</p>
                  <p>Nothing was charged. The time might still be free.</p>
                  <button type="button" className="btn" onClick={restartTime}>
                    Pick a time again
                  </button>
                </div>
              ) : (
                <PaymentStep
                  amount={deposit}
                  payee={creative.name}
                  defaultName={draft.details.name}
                  onPay={pay}
                  onBack={() => goTo('details')}
                  onHoldExpired={restartTime}
                />
              )}
            </>
          )}
        </section>

        <aside className={styles.summary} aria-label="Booking summary">
          <div className={styles.summaryHead}>
            <Photo name={creative.avatar} alt="" ratio={1} sizes="48px" className={styles.summaryAvatar} />
            <div>
              <p className={styles.summaryName}>{creative.name}</p>
              <p className={styles.muted}>{creative.area}</p>
            </div>
          </div>
          <dl className={styles.summaryList}>
            <div>
              <dt>Service</dt>
              <dd>{service ? service.name : '—'}</dd>
            </div>
            <div>
              <dt>When</dt>
              <dd>
                {draft.date ? (
                  <>
                    <span className={styles.wide}>{formatDateLong(draft.date)}</span>
                    <span className={styles.narrow}>{formatDateShort(draft.date)}</span>
                    {draft.start !== null && `, ${formatClock(draft.start)}`}
                  </>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            {service && (
              <>
                <div className={styles.wide}>
                  <dt>Duration</dt>
                  <dd>{formatDuration(service.durationMins)}</dd>
                </div>
                <div className={styles.total}>
                  <dt>Price</dt>
                  <dd className="num">{formatNaira(service.price)}</dd>
                </div>
                <div className={styles.due}>
                  <dt>Deposit now</dt>
                  <dd className="num">{formatNaira(deposit)}</dd>
                </div>
                <div className={styles.wide}>
                  <dt>On the day</dt>
                  <dd className="num">{formatNaira(service.price - deposit)}</dd>
                </div>
              </>
            )}
          </dl>
        </aside>
      </div>
    </div>
  )
}
