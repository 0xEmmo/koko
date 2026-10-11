import { Suspense } from 'react'
import { Link, NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { useOnline } from '../hooks/useOnline'
import { useSaved } from '../hooks/useSaved'
import { DemoControls } from './DemoControls'
import { Icon, type IconName } from './Icon'
import { RouteFallback } from './RouteFallback'
import { UpdatePrompt } from './UpdatePrompt'
import styles from './AppShell.module.css'

const tabs: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/', label: 'Discover', icon: 'compass', end: true },
  { to: '/saved', label: 'Saved', icon: 'heart' },
  { to: '/bookings', label: 'Bookings', icon: 'calendar' },
  { to: '/studio', label: 'Studio', icon: 'studio' },
]

export function Wordmark() {
  return (
    <Link to="/" className={styles.wordmark} aria-label="Kòkó home">
      Kòkó
    </Link>
  )
}

export function AppShell() {
  const online = useOnline()
  const { saved } = useSaved()
  const { pathname } = useLocation()
  const install = useInstallPrompt()
  const inFlow = /\/book$/.test(pathname)

  return (
    <div className={styles.shell} data-flow={inFlow}>
      <a href="#main" className={styles.skip}>
        Skip to content
      </a>
      <header className={styles.header}>
        <div className={`page ${styles.headerInner}`}>
          <Wordmark />
          {install && (
            <button type="button" className={`btn btn-ghost ${styles.install}`} onClick={install}>
              Install app
            </button>
          )}
          <nav aria-label="Main" className={styles.topNav}>
            {tabs.map((t) => (
              <NavLink key={t.to} to={t.to} end={t.end} className={styles.topLink}>
                {t.label}
                {t.to === '/saved' && saved.length > 0 && <span className={styles.count}>{saved.length}</span>}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {!online && (
        <div className={styles.offline} role="status">
          <Icon name="offline" size={18} />
          You’re offline. Saved creatives and your bookings still open; booking needs a connection.
        </div>
      )}

      <main id="main" className={styles.main} tabIndex={-1}>
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>

      <footer className={styles.footer}>
        <div className={`page ${styles.footerInner}`}>
          <p>
            Kòkó is a portfolio project by Emmanuel Balogun. Bookings and payments are simulated; nothing is charged.
          </p>
          <div className={styles.footerLinks}>
            <Link to="/credits">Photo credits</Link>
            <DemoControls />
          </div>
        </div>
      </footer>

      <nav aria-label="Main" className={styles.tabbar}>
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={styles.tab}>
            <Icon name={t.icon} size={22} />
            <span>{t.label}</span>
            {t.to === '/saved' && saved.length > 0 && (
              <span className={styles.badge}>
                <span className="sr-only">, </span>
                {saved.length}
                <span className="sr-only"> saved</span>
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <ScrollRestoration />
      <UpdatePrompt />
    </div>
  )
}
