import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { creditLine } from '../data/credits'
import type { GalleryItem } from '../data/types'
import { Icon } from './Icon'
import { photoMeta, photoUrl } from '../lib/photos'
import { Photo } from './Photo'
import styles from './Lightbox.module.css'

interface Props {
  items: GalleryItem[]
  index: number | null
  onChange: (index: number) => void
  onClose: () => void
}

const SWIPE_DISTANCE = 60
const SWIPE_VELOCITY = 0.45

export function Lightbox({ items, index, onChange, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const opener = useRef<Element | null>(null)
  const drag = useRef<{ x: number; y: number; t: number; id: number } | null>(null)
  const [dx, setDx] = useState(0)
  const open = index !== null
  const count = items.length
  const item = open ? items[index] : undefined

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      opener.current = document.activeElement
      d.showModal()
    } else if (!open && d.open) {
      d.close()
      if (opener.current instanceof HTMLElement) opener.current.focus()
    }
  }, [open])

  // warm the neighbours so swiping feels instant
  useEffect(() => {
    if (index === null) return
    for (const n of [index - 1, index + 1]) {
      const neighbour = items[(n + count) % count]
      if (!neighbour) continue
      const m = photoMeta(neighbour.photo)
      const img = new Image()
      img.src = photoUrl(neighbour.photo, m.widths[m.widths.length - 1]!)
    }
  }, [index, items, count])

  const go = (step: number) => {
    if (index === null) return
    onChange((index + step + count) % count)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') go(1)
    else if (e.key === 'ArrowLeft') go(-1)
    else if (e.key === 'Home') onChange(0)
    else if (e.key === 'End') onChange(count - 1)
    else return
    e.preventDefault()
  }

  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.pointerType === 'mouse') return
    drag.current = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!drag.current || drag.current.id !== e.pointerId) return
    setDx(e.clientX - drag.current.x)
  }

  const onPointerUp = (e: ReactPointerEvent) => {
    const start = drag.current
    drag.current = null
    if (!start) return
    const distX = e.clientX - start.x
    const distY = e.clientY - start.y
    const velocity = Math.abs(distX) / Math.max(1, performance.now() - start.t)
    setDx(0)
    if (distY > 120 && Math.abs(distY) > Math.abs(distX)) return onClose()
    if (Math.abs(distX) > SWIPE_DISTANCE || velocity > SWIPE_VELOCITY) go(distX < 0 ? 1 : -1)
  }

  return (
    <dialog
      ref={ref}
      className={styles.lightbox}
      aria-label="Photo viewer"
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onKeyDown={onKeyDown}
    >
      {item && index !== null && (
        <div className={styles.inner}>
          <div className={styles.top}>
            <p className={`num ${styles.counter}`} aria-live="polite">
              {index + 1} / {count}
            </p>
            <button type="button" className={styles.icon} onClick={onClose} aria-label="Close photo viewer">
              <Icon name="close" size={22} />
            </button>
          </div>

          <div
            className={styles.stage}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => {
              drag.current = null
              setDx(0)
            }}
            style={{ transform: dx ? `translateX(${dx}px)` : undefined, transition: dx ? 'none' : undefined }}
          >
            <Photo
              key={item.photo}
              name={item.photo}
              alt={item.alt}
              sizes="(min-width: 900px) 70vw, 100vw"
              fit="contain"
              priority
              className={styles.photo}
              style={{ aspectRatio: 'auto', backgroundColor: 'transparent', backgroundImage: 'none' }}
            />
          </div>

          <div className={styles.bottom}>
            <button type="button" className={styles.nav} onClick={() => go(-1)} aria-label="Previous photo">
              <Icon name="left" size={24} />
            </button>
            <div className={styles.text}>
              {item.caption && <p className={styles.caption}>{item.caption}</p>}
              <p className={styles.alt}>{item.alt}</p>
              <p className={styles.credit}>{creditLine(item.photo)}</p>
            </div>
            <button type="button" className={styles.nav} onClick={() => go(1)} aria-label="Next photo">
              <Icon name="right" size={24} />
            </button>
          </div>
          <p className="sr-only">Use the left and right arrow keys, or swipe, to move between photos.</p>
        </div>
      )}
    </dialog>
  )
}
