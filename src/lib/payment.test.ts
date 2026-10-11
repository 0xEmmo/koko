import { describe, expect, it } from 'vitest'
import { TEST_CARDS, detectBrand, formatCardNumber, formatExpiry, luhnValid, simulateCharge, validateCard } from './payment'

describe('card helpers', () => {
  it('runs the Luhn check', () => {
    expect(luhnValid('4084 0840 8408 4081')).toBe(true)
    expect(luhnValid('4084 0840 8408 4082')).toBe(false)
    expect(luhnValid(TEST_CARDS.insufficient)).toBe(true)
  })

  it('detects common Nigerian card brands', () => {
    expect(detectBrand('4084')).toBe('visa')
    expect(detectBrand('5399 83')).toBe('mastercard')
    expect(detectBrand('2221 00')).toBe('mastercard')
    expect(detectBrand('5061 2345')).toBe('verve')
    expect(detectBrand('9999')).toBe('unknown')
  })

  it('formats the number in groups of four and caps the length', () => {
    expect(formatCardNumber('40840840840840819999')).toBe('4084 0840 8408 4081')
    expect(formatCardNumber('5061000000000000007')).toBe('5061 0000 0000 0000 007')
  })

  it('formats expiry as the user types', () => {
    expect(formatExpiry('1')).toBe('1')
    expect(formatExpiry('4')).toBe('04/')
    expect(formatExpiry('1228')).toBe('12/28')
  })
})

describe('validateCard', () => {
  const now = new Date('2026-10-11T12:00:00Z')
  const good = { number: TEST_CARDS.success, expiry: '09/29', cvv: '408', name: 'Ada Okafor' }

  it('accepts a valid card', () => {
    expect(validateCard(good, now)).toEqual({})
  })

  it('reports each problem with a human message', () => {
    expect(validateCard({ number: '', expiry: '', cvv: '1', name: '' }, now)).toEqual({
      number: 'Enter your card number',
      expiry: 'Enter the expiry date',
      cvv: 'CVV is the 3 digits on the back',
      name: 'Enter the name on the card',
    })
  })

  it('rejects expired cards but allows the current month', () => {
    expect(validateCard({ ...good, expiry: '09/26' }, now).expiry).toBe('This card has expired')
    expect(validateCard({ ...good, expiry: '10/26' }, now).expiry).toBeUndefined()
    expect(validateCard({ ...good, expiry: '13/27' }, now).expiry).toBe('Use MM/YY')
  })
})

describe('simulateCharge', () => {
  it('succeeds, declines or fails for funds based on the test card', () => {
    expect(simulateCharge(TEST_CARDS.success, 'KK-1')).toEqual({ ok: true, reference: 'KK-1' })
    expect(simulateCharge(TEST_CARDS.declined, 'KK-2')).toMatchObject({ ok: false, reason: 'declined' })
    expect(simulateCharge(TEST_CARDS.insufficient, 'KK-3')).toMatchObject({ ok: false, reason: 'insufficient-funds' })
  })
})
