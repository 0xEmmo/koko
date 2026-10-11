import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { Icon } from './Icon'
import { ToastContext, type Push, type Toast } from './toast'
import styles from './Toaster.module.css'

export function Toaster({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const push = useCallback<Push>(
    (message, opts = {}) => {
      const id = nextId.current++
      setToasts((t) => [...t.slice(-2), { id, message, tone: opts.tone ?? 'neutral', action: opts.action }])
      window.setTimeout(() => dismiss(id), opts.action ? 8000 : 5000)
    },
    [dismiss],
  )

  const value = useMemo(() => push, [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.region} role="status" aria-live="polite" aria-relevant="additions">
        {toasts.map((t) => (
          <div key={t.id} className={styles.toast} data-tone={t.tone}>
            <span>{t.message}</span>
            {t.action && (
              <button
                type="button"
                className={styles.action}
                onClick={() => {
                  t.action!.onClick()
                  dismiss(t.id)
                }}
              >
                {t.action.label}
              </button>
            )}
            <button type="button" className={styles.close} onClick={() => dismiss(t.id)} aria-label="Dismiss">
              <Icon name="close" size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
