import { useState, type CSSProperties } from 'react'
import { photoMeta, photoUrl } from '../lib/photos'
import styles from './Photo.module.css'

const srcSet = (name: string, widths: number[], format: 'avif' | 'webp') =>
  widths.map((w) => `${photoUrl(name, w, format)} ${w}w`).join(', ')

interface Props {
  name: string
  alt: string
  sizes: string
  /** Above-the-fold images: eager, high fetch priority, no fade. */
  priority?: boolean
  /** Crop to this aspect ratio instead of the photo's own. */
  ratio?: number
  className?: string
  style?: CSSProperties
  fit?: 'cover' | 'contain'
}

export function Photo({ name, alt, sizes, priority = false, ratio, className, style, fit = 'cover' }: Props) {
  const m = photoMeta(name)
  const [loaded, setLoaded] = useState(false)
  const largest = m.widths[m.widths.length - 1]!
  const fallback = m.widths.find((w) => w >= 960) ?? largest

  return (
    <span
      className={[styles.frame, className].filter(Boolean).join(' ')}
      data-loaded={loaded || priority}
      style={{
        aspectRatio: String(ratio ?? m.ratio),
        backgroundColor: m.tint,
        backgroundImage: `url(${m.blur})`,
        ...style,
      }}
    >
      <picture>
        <source type="image/avif" srcSet={srcSet(name, m.widths, 'avif')} sizes={sizes} />
        <source type="image/webp" srcSet={srcSet(name, m.widths, 'webp')} sizes={sizes} />
        <img
          src={photoUrl(name, fallback)}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={() => setLoaded(true)}
          ref={(img) => {
            if (img?.complete && img.naturalWidth > 0) setLoaded(true)
          }}
          style={{ objectFit: fit }}
        />
      </picture>
    </span>
  )
}
