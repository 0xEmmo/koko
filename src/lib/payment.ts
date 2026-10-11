export type CardBrand = 'visa' | 'mastercard' | 'verve' | 'unknown'

export const digitsOnly = (value: string) => value.replace(/\D/g, '')

export function luhnValid(number: string) {
  const digits = digitsOnly(number)
  if (digits.length < 12) return false
  let sum = 0
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i])
    if (i % 2 === 1) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
  }
  return sum % 10 === 0
}

export function detectBrand(number: string): CardBrand {
  const d = digitsOnly(number)
  if (/^(5060|5061|5078|5079|6500)/.test(d)) return 'verve'
  if (/^4/.test(d)) return 'visa'
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(d)) return 'mastercard'
  return 'unknown'
}

const maxLength = (brand: CardBrand) => (brand === 'verve' ? 19 : 16)

/** Groups of four as the user types: "4084 0840 8408 4081". */
export function formatCardNumber(value: string) {
  const d = digitsOnly(value).slice(0, maxLength(detectBrand(value)))
  return d.replace(/(\d{4})(?=\d)/g, '$1 ')
}

export function formatExpiry(value: string) {
  const d = digitsOnly(value).slice(0, 4)
  if (d.length === 1 && Number(d) > 1) return `0${d}/`
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d
}

export interface CardInput {
  number: string
  expiry: string
  cvv: string
  name: string
}

export type CardErrors = Partial<Record<keyof CardInput, string>>

export function validateCard(card: CardInput, now = new Date()): CardErrors {
  const errors: CardErrors = {}
  const digits = digitsOnly(card.number)

  if (!digits) errors.number = 'Enter your card number'
  else if (digits.length < 16 || !luhnValid(digits)) errors.number = 'That card number doesn’t look right'

  const match = /^(\d{2})\/(\d{2})$/.exec(card.expiry.trim())
  if (!card.expiry.trim()) errors.expiry = 'Enter the expiry date'
  else if (!match) errors.expiry = 'Use MM/YY'
  else {
    const month = Number(match[1])
    const year = 2000 + Number(match[2])
    const nowMonth = now.getFullYear() * 12 + now.getMonth()
    if (month < 1 || month > 12) errors.expiry = 'Use MM/YY'
    else if (year * 12 + month - 1 < nowMonth) errors.expiry = 'This card has expired'
  }

  if (!/^\d{3,4}$/.test(card.cvv)) errors.cvv = 'CVV is the 3 digits on the back'
  if (card.name.trim().length < 2) errors.name = 'Enter the name on the card'
  return errors
}

export type ChargeResult =
  | { ok: true; reference: string }
  | { ok: false; reason: 'declined' | 'insufficient-funds'; message: string }

/**
 * Test cards, modelled loosely on how Nigerian gateways document theirs.
 * Any other number that passes validation goes through.
 */
export const TEST_CARDS = {
  success: '4084 0840 8408 4081',
  declined: '4000 0000 0000 0002',
  insufficient: '5061 0000 0000 0000 007',
} as const

export function simulateCharge(number: string, reference: string): ChargeResult {
  const d = digitsOnly(number)
  if (d === digitsOnly(TEST_CARDS.declined)) {
    return { ok: false, reason: 'declined', message: 'Your bank declined this payment. Try another card or pay by transfer.' }
  }
  if (d === digitsOnly(TEST_CARDS.insufficient)) {
    return { ok: false, reason: 'insufficient-funds', message: 'Insufficient funds on this card.' }
  }
  return { ok: true, reference }
}
