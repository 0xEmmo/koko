import meta from '../data/photo-meta.json'

export type PhotoMeta = { ratio: number; widths: number[]; tint: string; blur: string }
const photos = meta as Record<string, PhotoMeta>

export function photoMeta(name: string): PhotoMeta {
  const m = photos[name]
  if (!m) throw new Error(`Unknown photo: ${name}`)
  return m
}

export const photoUrl = (name: string, width: number, format: 'avif' | 'webp' = 'webp') =>
  `/photos/${name}-${width}.${format}`
