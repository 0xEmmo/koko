import { describe, expect, it } from 'vitest'
import { formatNigerianPhone, normaliseNigerianPhone, validEmail } from './phone'

describe('normaliseNigerianPhone', () => {
  it('accepts local and international forms', () => {
    expect(normaliseNigerianPhone('0803 123 4567')).toBe('+2348031234567')
    expect(normaliseNigerianPhone('+234 803 123 4567')).toBe('+2348031234567')
    expect(normaliseNigerianPhone('2349061234567')).toBe('+2349061234567')
    expect(normaliseNigerianPhone('07012345678')).toBe('+2347012345678')
  })

  it('rejects landlines, short numbers and junk', () => {
    expect(normaliseNigerianPhone('01 234 5678')).toBeNull()
    expect(normaliseNigerianPhone('0803123456')).toBeNull()
    expect(normaliseNigerianPhone('hello')).toBeNull()
  })

  it('formats for display', () => {
    expect(formatNigerianPhone('+2348031234567')).toBe('0803 123 4567')
  })
})

describe('validEmail', () => {
  it('does a light sanity check', () => {
    expect(validEmail('ada@gmail.com')).toBe(true)
    expect(validEmail('ada@gmail')).toBe(false)
    expect(validEmail('ada gmail.com')).toBe(false)
  })
})
