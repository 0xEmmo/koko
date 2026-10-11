import type { ReactNode } from 'react'
import { isApiError } from '../api/types'
import { Icon } from './Icon'
import styles from './States.module.css'

export function ErrorState({ error, onRetry, compact }: { error: Error; onRetry?: () => void; compact?: boolean }) {
  const offline = isApiError(error, 'offline')
  return (
    <div className={styles.box} data-compact={compact} role="alert">
      <Icon name={offline ? 'offline' : 'alert'} size={28} />
      <div>
        <p className={styles.title}>{offline ? 'No connection' : 'Something went wrong'}</p>
        <p className={styles.text}>{error.message}</p>
      </div>
      {onRetry && (
        <button type="button" className="btn btn-ghost" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className={styles.empty}>
      <p className={styles.emptyTitle}>{title}</p>
      {children && <p className={styles.text}>{children}</p>}
      {action}
    </div>
  )
}

export function Skeleton({ height = 16, width = '100%', radius = 4 }: { height?: number | string; width?: number | string; radius?: number }) {
  return <span className={styles.skeleton} style={{ height, width, borderRadius: radius }} aria-hidden />
}
