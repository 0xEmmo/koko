import { useEffect } from 'react'
import { Link } from 'react-router'
import { listCreatives } from '../api/client'
import { CreativeCard } from '../components/CreativeCard'
import { EmptyState, ErrorState, Skeleton } from '../components/States'
import { useResource } from '../hooks/useResource'
import { useSaved } from '../hooks/useSaved'
import styles from './SavedPage.module.css'

export default function SavedPage() {
  const { saved } = useSaved()
  const res = useResource(() => listCreatives(), [], { live: true })

  useEffect(() => {
    document.title = 'Saved · Kòkó'
  }, [])

  const entries = (res.data ?? [])
    .filter((e) => saved.includes(e.creative.id))
    .sort((a, b) => saved.indexOf(a.creative.id) - saved.indexOf(b.creative.id))

  return (
    <div className={`page ${styles.page}`}>
      <header className={styles.head}>
        <h1 className={styles.title}>Saved</h1>
        <p className={styles.sub}>People you want to come back to. Stored on this device.</p>
      </header>
      {saved.length === 0 ? (
        <EmptyState
          title="Nothing saved yet"
          action={
            <Link to="/" className="btn">
              Browse creatives
            </Link>
          }
        >
          Tap the heart on anyone’s card or profile to keep them here.
        </EmptyState>
      ) : res.status === 'error' && !res.data ? (
        <ErrorState error={res.error} onRetry={res.retry} />
      ) : !res.data ? (
        <div className={styles.grid}>
          {saved.map((id) => (
            <Skeleton key={id} height={420} radius={8} />
          ))}
        </div>
      ) : (
        <div className={styles.grid}>
          {entries.map((e) => (
            <CreativeCard key={e.creative.id} entry={e} />
          ))}
        </div>
      )}
    </div>
  )
}
