import { Link } from 'react-router'
import type { DirectoryEntry } from '../api/client'
import { craftLabel, firstNameOf } from '../data/creatives'
import { useSaved } from '../hooks/useSaved'
import { formatNaira } from '../lib/money'
import { formatClock, lagosNow, relativeDay } from '../lib/time'
import { Icon } from './Icon'
import { Photo } from './Photo'
import { useToast } from './toast'
import styles from './CreativeCard.module.css'

interface Props {
  entry: DirectoryEntry
  priority?: boolean
}

export function CreativeCard({ entry, priority }: Props) {
  const { creative, fromPrice, rating, reviewCount, next } = entry
  const { isSaved, toggle } = useSaved()
  const toast = useToast()
  const saved = isSaved(creative.id)
  const cover = creative.gallery[0]!
  const firstName = firstNameOf(creative)

  return (
    <article className={styles.card}>
      <div className={styles.media}>
        <Photo
          name={cover.photo}
          alt=""
          ratio={4 / 5}
          sizes="(min-width: 1240px) 300px, (min-width: 640px) 45vw, 92vw"
          priority={priority}
        />
        <span className={styles.avatar}>
          <Photo name={creative.avatar} alt="" ratio={1} sizes="56px" priority={priority} />
        </span>
        <button
          type="button"
          className={styles.save}
          aria-pressed={saved}
          aria-label={`Save ${creative.name}`}
          onClick={() => {
            const now = toggle(creative.id)
            toast(now ? `Saved ${firstName}` : `Removed ${firstName} from saved`)
          }}
        >
          <Icon name="heart" filled={saved} size={20} />
        </button>
      </div>
      <div className={styles.body}>
        <p className={styles.meta}>
          {craftLabel(creative.craft)} · {creative.area}
          {creative.city !== 'Lagos' && `, ${creative.city}`}
        </p>
        <h3 className={styles.name}>
          <Link to={`/c/${creative.slug}`} className={styles.link} viewTransition>
            {creative.name}
          </Link>
        </h3>
        <p className={styles.headline}>{creative.headline}</p>
        <dl className={styles.facts}>
          <div>
            <dt className="sr-only">Starting price</dt>
            <dd>
              From <strong className="num">{formatNaira(fromPrice)}</strong>
            </dd>
          </div>
          <div>
            <dt className="sr-only">Rating</dt>
            <dd className={styles.rating}>
              <Icon name="star" size={14} filled />
              <span className="num">{rating.toFixed(1)}</span>
              <span className={styles.muted}>({reviewCount})</span>
            </dd>
          </div>
        </dl>
        <p className={styles.next} data-none={!next}>
          <Icon name="clock" size={15} />
          {next ? (
            <span>
              Next free <strong>{relativeDay(next.date, lagosNow().date)}</strong>, {formatClock(next.start)}
            </span>
          ) : (
            <span>Fully booked for 3 weeks</span>
          )}
        </p>
      </div>
    </article>
  )
}

export function CreativeCardSkeleton() {
  return (
    <div className={styles.card} aria-hidden>
      <div className={styles.skeletonMedia} />
      <div className={styles.body}>
        <span className={styles.skeletonLine} style={{ width: '45%' }} />
        <span className={styles.skeletonLine} style={{ width: '75%', height: 26 }} />
        <span className={styles.skeletonLine} style={{ width: '90%' }} />
      </div>
    </div>
  )
}
