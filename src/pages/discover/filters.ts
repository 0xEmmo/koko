import type { DirectoryFilters } from '../../api/client'
import type { Craft } from '../../data/types'

const CRAFTS: Craft[] = ['photography', 'barbering', 'hair', 'makeup']
const SORTS = ['soonest', 'rating', 'price'] as const

export const PRICE_CAPS = [15_000, 50_000, 100_000, 250_000]

/** URL search params are the source of truth so filtered views can be shared. */
export function filtersFromParams(params: URLSearchParams): Required<DirectoryFilters> {
  const craft = params.get('craft') as Craft | null
  const sort = params.get('sort') as (typeof SORTS)[number] | null
  const max = Number(params.get('max'))
  return {
    q: params.get('q') ?? '',
    craft: craft && CRAFTS.includes(craft) ? craft : 'all',
    city: params.get('city') === 'Lagos' || params.get('city') === 'Abuja' ? params.get('city')! : '',
    maxPrice: PRICE_CAPS.includes(max) ? max : 0,
    thisWeek: params.get('week') === '1',
    sort: sort && SORTS.includes(sort) ? sort : 'soonest',
  }
}

export function paramsFromFilters(f: Required<DirectoryFilters>) {
  const p = new URLSearchParams()
  if (f.q.trim()) p.set('q', f.q.trim())
  if (f.craft !== 'all') p.set('craft', f.craft)
  if (f.city) p.set('city', f.city)
  if (f.maxPrice) p.set('max', String(f.maxPrice))
  if (f.thisWeek) p.set('week', '1')
  if (f.sort !== 'soonest') p.set('sort', f.sort)
  return p
}

/** How many of the "secondary" filters (the ones hidden in the sheet on mobile) are on. */
export function activeFilterCount(f: Required<DirectoryFilters>) {
  return [f.city, f.maxPrice, f.thisWeek].filter(Boolean).length
}
