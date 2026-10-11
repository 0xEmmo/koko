import { describe, expect, it } from 'vitest'
import { validateDetails } from './validateDetails'

describe('validateDetails', () => {
  it('passes complete details', () => {
    expect(validateDetails({ name: 'Ada Okafor', phone: '0803 123 4567', email: 'ada@example.com', notes: '' })).toEqual({})
  })

  it('explains what is missing', () => {
    const errors = validateDetails({ name: '', phone: '01 234', email: 'ada@', notes: 'x'.repeat(501) })
    expect(Object.keys(errors)).toEqual(['name', 'phone', 'email', 'notes'])
    expect(errors.phone).toMatch(/Nigerian mobile/)
  })
})
