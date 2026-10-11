import type { ClientDetails } from '../../api/types'
import type { DateKey } from '../../lib/time'

export type Step = 'service' | 'time' | 'details' | 'pay'

export interface Draft {
  step: Step
  serviceId: string | null
  date: DateKey | null
  start: number | null
  hold: { id: string; expiresAt: number } | null
  details: ClientDetails
}

export const emptyDetails: ClientDetails = { name: '', phone: '', email: '', notes: '' }

const key = (slug: string) => `koko.draft.${slug}`

/** Survives a refresh mid-booking, but not a new tab (holds are per tab too). */
export function loadDraft(slug: string): Draft | null {
  try {
    const raw = sessionStorage.getItem(key(slug))
    if (!raw) return null
    const d = JSON.parse(raw) as Draft
    if (d.hold && d.hold.expiresAt <= Date.now()) return { ...d, hold: null, step: d.step === 'service' ? 'service' : 'time', start: null }
    return d
  } catch {
    return null
  }
}

export function saveDraft(slug: string, draft: Draft) {
  sessionStorage.setItem(key(slug), JSON.stringify(draft))
}

export function clearDraft(slug: string) {
  sessionStorage.removeItem(key(slug))
}

const DETAILS_KEY = 'koko.details'

/** Remember contact details between bookings, like a real app would. */
export function rememberedDetails(): ClientDetails {
  try {
    return { ...emptyDetails, ...JSON.parse(localStorage.getItem(DETAILS_KEY) ?? '{}'), notes: '' }
  } catch {
    return emptyDetails
  }
}

export function rememberDetails(d: ClientDetails) {
  localStorage.setItem(DETAILS_KEY, JSON.stringify({ name: d.name, phone: d.phone, email: d.email }))
}
