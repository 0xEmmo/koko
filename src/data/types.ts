import type { DateKey } from '../lib/time'

export type Craft = 'photography' | 'barbering' | 'hair' | 'makeup'

export type City = 'Lagos' | 'Abuja'

/** [open, close] in minutes after midnight, Lagos time. */
export type OpeningSpan = readonly [number, number]

/** Indexed by weekday, 0 = Sunday. Empty array means closed. */
export type WeeklyHours = readonly (readonly OpeningSpan[])[]

export type ServiceLocation = 'studio' | 'home' | 'on-location'

export interface Service {
  id: string
  name: string
  description: string
  durationMins: number
  price: number
  /** Fixed deposit in naira. Falls back to the creative's deposit percentage. */
  deposit?: number
  location: ServiceLocation
}

export interface GalleryItem {
  photo: string
  alt: string
  caption?: string
}

export interface Review {
  id: string
  author: string
  service: string
  rating: number
  date: DateKey
  body: string
}

export interface Creative {
  id: string
  slug: string
  name: string
  craft: Craft
  headline: string
  area: string
  city: City
  bio: string
  since: number
  languages: string[]
  avatar: string
  avatarAlt: string
  gallery: GalleryItem[]
  services: Service[]
  hours: WeeklyHours
  /** Gap kept clear after every appointment. */
  bufferMins: number
  /** Earliest a client can book, measured from now. */
  leadTimeHours: number
  depositPercent: number
  /** Free cancellation if the client cancels at least this far ahead. */
  freeCancelHours: number
  instagram: string
  reviews: Review[]
}
