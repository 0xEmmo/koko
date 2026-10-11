import { useEffect } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { getCreative, ratingOf } from '../../api/client'
import { Gallery } from '../../components/Gallery'
import { Icon } from '../../components/Icon'
import { Lightbox } from '../../components/Lightbox'
import { Photo } from '../../components/Photo'
import { RouteFallback } from '../../components/RouteFallback'
import { ErrorState } from '../../components/States'
import { useToast } from '../../components/toast'
import { craftLabel } from '../../data/creatives'
import type { Creative, Service } from '../../data/types'
import { useResource } from '../../hooks/useResource'
import { useSaved } from '../../hooks/useSaved'
import { formatNaira } from '../../lib/money'
import { depositFor, describeNotice } from '../../lib/policy'
import { formatDateLong, formatDuration } from '../../lib/time'
import { NotFound } from '../NotFoundPage'
import styles from './CreativePage.module.css'

const locationLabel: Record<Service['location'], string> = {
  studio: 'At the studio',
  home: 'Comes to you',
  'on-location': 'On location',
}

export default function CreativePage() {
  const { slug = '' } = useParams()
  const res = useResource(() => getCreative(slug), [slug])

  if (res.status === 'error') {
    if ((res.error as { code?: string }).code === 'not-found') return <NotFound what="creative" />
    return (
      <div className="page" style={{ paddingBlock: '2rem' }}>
        <ErrorState error={res.error} onRetry={res.retry} />
      </div>
    )
  }
  if (!res.data) return <RouteFallback />
  return <Profile creative={res.data} />
}

function Profile({ creative }: { creative: Creative }) {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { isSaved, toggle } = useSaved()
  const saved = isSaved(creative.id)
  const photoParam = params.get('photo')
  const photoIndex = photoParam !== null && Number(photoParam) >= 0 && Number(photoParam) < creative.gallery.length ? Number(photoParam) : null
  const rating = ratingOf(creative)
  const fromPrice = Math.min(...creative.services.map((s) => s.price))
  const bookHref = `/c/${creative.slug}/book`

  useEffect(() => {
    document.title = `${creative.name} · ${craftLabel(creative.craft)} in ${creative.area} · Kòkó`
  }, [creative])

  // The open photo lives in the URL, so Back closes the viewer on phones.
  const openPhoto = (i: number) => setParams({ photo: String(i) }, { preventScrollReset: true })
  const changePhoto = (i: number) => setParams({ photo: String(i) }, { replace: true, preventScrollReset: true })
  const closePhoto = () => {
    if (window.history.state?.idx > 0) navigate(-1)
    else setParams({}, { replace: true, preventScrollReset: true })
  }

  return (
    <article className={styles.profile}>
      <div className={`page ${styles.layout}`}>
        <header className={styles.intro}>
          <Link to="/" className={styles.back}>
            <Icon name="left" size={16} /> All creatives
          </Link>
          <div className={styles.identity}>
            <Photo name={creative.avatar} alt={creative.avatarAlt} ratio={1} sizes="96px" priority className={styles.avatar} />
            <div>
              <p className="eyebrow">{craftLabel(creative.craft)}</p>
              <h1 className={styles.name}>{creative.name}</h1>
            </div>
          </div>
          <p className={styles.headline}>{creative.headline}</p>
          <ul className={styles.facts}>
            <li>
              <Icon name="pin" size={16} />
              {creative.area}, {creative.city}
            </li>
            <li>
              <Icon name="star" size={16} filled />
              <span className="num">{rating.toFixed(1)}</span> from {creative.reviews.length} reviews
            </li>
            <li>
              <Icon name="clock" size={16} />
              Working since {creative.since}
            </li>
          </ul>
          <p className={styles.bio}>{creative.bio}</p>
          <p className={styles.small}>
            Speaks {creative.languages.join(', ')} · <span aria-label="Instagram">@{creative.instagram}</span>
          </p>
          <div className={styles.actions}>
            <Link to={bookHref} className="btn btn-accent">
              Book a time
            </Link>
            <button
              type="button"
              className="btn btn-ghost"
              aria-pressed={saved}
              onClick={() => toast(toggle(creative.id) ? 'Saved' : 'Removed from saved')}
            >
              <Icon name="heart" filled={saved} size={18} />
              {saved ? 'Saved' : 'Save'}
            </button>
          </div>
          <nav className={styles.jump} aria-label="On this page">
            <a href="#work">Work</a>
            <a href="#services">Services</a>
            <a href="#reviews">Reviews</a>
            <a href="#policies">Policies</a>
          </nav>
        </header>

        <section id="work" className={styles.work} aria-labelledby="work-title">
          <h2 id="work-title" className="sr-only">
            Work
          </h2>
          <Gallery items={creative.gallery} onOpen={openPhoto} ownerName={creative.name.split(' ')[0]!} />
        </section>
      </div>

      <div className={`page ${styles.lower}`}>
        <section id="services" aria-labelledby="services-title">
          <SectionHead n="01" id="services-title" title="Services" />
          <ul className={styles.services}>
            {creative.services.map((s) => (
              <li key={s.id} className={styles.service}>
                <div>
                  <h3 className={styles.serviceName}>{s.name}</h3>
                  <p className={styles.serviceText}>{s.description}</p>
                  <p className={styles.serviceMeta}>
                    <span>
                      <Icon name="clock" size={15} /> {formatDuration(s.durationMins)}
                    </span>
                    <span>
                      <Icon name="pin" size={15} /> {locationLabel[s.location]}
                    </span>
                  </p>
                </div>
                <div className={styles.servicePrice}>
                  <p className={`num ${styles.price}`}>{formatNaira(s.price)}</p>
                  <p className={styles.deposit}>{formatNaira(depositFor(creative, s))} deposit</p>
                  <Link to={`${bookHref}?service=${s.id}`} className="btn btn-ghost" aria-label={`Book ${s.name}`}>
                    Book
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section id="reviews" aria-labelledby="reviews-title">
          <SectionHead n="02" id="reviews-title" title="Reviews" />
          <ul className={styles.reviews}>
            {creative.reviews.map((r) => (
              <li key={r.id} className={styles.review}>
                <p className={styles.stars} aria-label={`${r.rating} out of 5`}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <Icon key={i} name="star" size={14} filled={i < r.rating} />
                  ))}
                </p>
                <blockquote className={styles.quote}>{r.body}</blockquote>
                <p className={styles.small}>
                  {r.author} · {r.service} · {formatDateLong(r.date)}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section id="policies" aria-labelledby="policies-title">
          <SectionHead n="03" id="policies-title" title="Before you book" />
          <dl className={styles.policies}>
            <div>
              <dt>Deposit</dt>
              <dd>
                {creative.depositPercent}% of the price, paid when you book. The rest is paid to {creative.name.split(' ')[0]} on the
                day.
              </dd>
            </div>
            <div>
              <dt>Cancelling</dt>
              <dd>
                Free up to {describeNotice(creative.freeCancelHours)} before. After that the deposit isn’t refunded.
              </dd>
            </div>
            <div>
              <dt>Moving a booking</dt>
              <dd>Up to twice, as long as it’s more than {describeNotice(creative.freeCancelHours)} away.</dd>
            </div>
            <div>
              <dt>Notice</dt>
              <dd>Book at least {describeNotice(creative.leadTimeHours)} ahead.</dd>
            </div>
          </dl>
        </section>
      </div>

      <div className={styles.stickyBar}>
        <p>
          <span className={styles.small}>From</span> <strong className="num">{formatNaira(fromPrice)}</strong>
        </p>
        <Link to={bookHref} className="btn btn-accent">
          Book a time
        </Link>
      </div>

      <Lightbox items={creative.gallery} index={photoIndex} onChange={changePhoto} onClose={closePhoto} />
    </article>
  )
}

function SectionHead({ n, id, title }: { n: string; id: string; title: string }) {
  return (
    <div className={styles.sectionHead}>
      <span className={`num ${styles.sectionNum}`} aria-hidden>
        {n}
      </span>
      <h2 id={id} className={styles.sectionTitle}>
        {title}
      </h2>
    </div>
  )
}
