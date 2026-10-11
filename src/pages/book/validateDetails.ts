import type { ClientDetails } from '../../api/types'
import { normaliseNigerianPhone, validEmail } from '../../lib/phone'

export type DetailErrors = Partial<Record<keyof ClientDetails, string>>

export function validateDetails(d: ClientDetails): DetailErrors {
  const errors: DetailErrors = {}
  if (d.name.trim().length < 2) errors.name = 'Tell us your name so they know who to expect'
  if (!d.phone.trim()) errors.phone = 'Add a phone number for day-of updates'
  else if (!normaliseNigerianPhone(d.phone)) errors.phone = 'Use a Nigerian mobile number, like 0803 123 4567'
  if (!d.email.trim()) errors.email = 'We’ll send your receipt here'
  else if (!validEmail(d.email)) errors.email = 'That email doesn’t look complete'
  if (d.notes.length > 500) errors.notes = 'Keep notes under 500 characters'
  return errors
}
