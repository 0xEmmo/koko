import { describe, expect, it } from 'vitest'
import { activeFilterCount, filtersFromParams, paramsFromFilters } from './filters'

describe('discover filters', () => {
  it('reads defaults from an empty URL', () => {
    expect(filtersFromParams(new URLSearchParams())).toEqual({
      q: '',
      craft: 'all',
      city: '',
      maxPrice: 0,
      thisWeek: false,
      sort: 'soonest',
    })
  })

  it('ignores values it does not recognise', () => {
    const f = filtersFromParams(new URLSearchParams('craft=plumbing&max=123&sort=random&city=Kano'))
    expect(f.craft).toBe('all')
    expect(f.maxPrice).toBe(0)
    expect(f.sort).toBe('soonest')
    expect(f.city).toBe('')
  })

  it('round-trips through the URL and drops defaults', () => {
    const f = filtersFromParams(new URLSearchParams('craft=hair&max=50000&week=1&q=locs'))
    expect(paramsFromFilters(f).toString()).toBe('q=locs&craft=hair&max=50000&week=1')
    expect(paramsFromFilters(filtersFromParams(new URLSearchParams())).toString()).toBe('')
  })

  it('counts the secondary filters', () => {
    expect(activeFilterCount(filtersFromParams(new URLSearchParams('city=Abuja&week=1&craft=hair')))).toBe(2)
  })
})
