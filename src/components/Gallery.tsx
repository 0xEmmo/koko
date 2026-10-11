import { useLayoutEffect, useRef, useState } from 'react'
import type { GalleryItem } from '../data/types'
import { columnsFor, layoutMasonry } from '../lib/masonry'
import { photoMeta } from '../lib/photos'
import { Photo } from './Photo'
import styles from './Gallery.module.css'

interface Props {
  items: GalleryItem[]
  onOpen: (index: number) => void
  ownerName: string
}

const GAP = 10

export function Gallery({ items, onOpen, ownerName }: Props) {
  const ref = useRef<HTMLUListElement>(null)
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(el.clientWidth)
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry!.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const cols = columnsFor(width)
  const layout = layoutMasonry(
    items.map((i) => photoMeta(i.photo).ratio),
    width,
    cols,
    GAP,
  )
  const colWidth = width ? Math.round(layout.items[0]?.width ?? 300) : 300

  return (
    <ul
      ref={ref}
      className={styles.grid}
      style={{ height: width ? layout.height : undefined }}
      data-measured={width > 0}
      aria-label={`${ownerName}’s work, ${items.length} photos`}
    >
      {items.map((item, i) => {
        const pos = layout.items[i]
        return (
          <li
            key={item.photo}
            className={styles.item}
            style={
              width && pos
                ? { transform: `translate(${pos.x}px, ${pos.y}px)`, width: pos.width, height: pos.height }
                : undefined
            }
          >
            <button type="button" className={styles.button} onClick={() => onOpen(i)} aria-label={`Open photo ${i + 1}: ${item.alt}`}>
              <Photo name={item.photo} alt="" sizes={`${colWidth}px`} priority={i < cols} />
              {item.caption && <span className={styles.caption}>{item.caption}</span>}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
