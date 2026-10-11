import { describe, expect, it } from 'vitest'
import { formatNaira, formatNairaShort } from './money'

describe('formatNaira', () => {
  it('uses the naira sign and thousands separators', () => {
    expect(formatNaira(25000)).toBe('₦25,000')
    expect(formatNaira(1250000)).toBe('₦1,250,000')
  })

  it('rounds to whole naira', () => {
    expect(formatNaira(999.6)).toBe('₦1,000')
  })
})

describe('formatNairaShort', () => {
  it('compacts thousands and millions', () => {
    expect(formatNairaShort(85000)).toBe('₦85k')
    expect(formatNairaShort(12500)).toBe('₦12.5k')
    expect(formatNairaShort(1200000)).toBe('₦1.2m')
    expect(formatNairaShort(800)).toBe('₦800')
  })
})
