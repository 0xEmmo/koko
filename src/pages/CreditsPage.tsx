import { useEffect } from 'react'
import { Photo } from '../components/Photo'
import { allCredits } from '../data/credits'
import styles from './CreditsPage.module.css'

const entries = Object.entries(allCredits).sort(([a], [b]) => a.localeCompare(b))
const photographers = new Set(entries.map(([, c]) => c.author))

export default function CreditsPage() {
  useEffect(() => {
    document.title = 'Photo credits · Kòkó'
  }, [])

  return (
    <div className={`page ${styles.page}`}>
      <header className={styles.head}>
        <h1 className={styles.title}>Photo credits</h1>
        <p className={styles.sub}>
          Every photo in Kòkó is a real photograph from Unsplash, used under the{' '}
          <a href="https://unsplash.com/license" rel="noreferrer">
            Unsplash License
          </a>
          . The people pictured are models and subjects from those photos, not the fictional creatives they stand in for.
          Thank you to the {photographers.size} photographers below.
        </p>
      </header>
      <ul className={styles.grid}>
        {entries.map(([file, c]) => (
          <li key={file} className={styles.item}>
            <a href={c.page} rel="noreferrer" className={styles.link}>
              <Photo name={file} alt="" ratio={1} sizes="160px" />
              <span className="sr-only">Photo on Unsplash</span>
            </a>
            <p className={styles.by}>
              <a href={c.authorUrl} rel="noreferrer">
                {c.author}
              </a>
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
