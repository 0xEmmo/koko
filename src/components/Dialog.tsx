import { useEffect, useRef, type ReactNode } from 'react'
import { Icon } from './Icon'
import styles from './Dialog.module.css'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** Rendered as a bottom sheet on small screens. */
  sheet?: boolean
  wide?: boolean
  hideTitle?: boolean
}

/**
 * Wraps the native <dialog>, which gives us the focus trap, Escape handling
 * and inert background for free. Focus goes back to whatever opened it.
 */
export function Dialog({ open, onClose, title, children, sheet = true, wide = false, hideTitle = false }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const opener = useRef<Element | null>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      opener.current = document.activeElement
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
      if (opener.current instanceof HTMLElement) opener.current.focus()
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      data-sheet={sheet}
      data-wide={wide}
      aria-labelledby="dialog-title"
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
    >
      {open && (
        <div className={styles.body}>
          <header className={styles.head}>
            <h2 id="dialog-title" className={hideTitle ? 'sr-only' : styles.title}>
              {title}
            </h2>
            <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
              <Icon name="close" />
            </button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  )
}
