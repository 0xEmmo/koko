import type { DateKey } from '../lib/time'

export type BookingStatus = 'confirmed' | 'cancelled' | 'completed' | 'no-show'

export interface ClientDetails {
  name: string
  phone: string
  email: string
  notes: string
}

export interface BookingEvent {
  at: string
  type: 'booked' | 'rescheduled' | 'cancelled' | 'completed' | 'no-show'
  from?: { date: DateKey; start: number }
}

export interface Booking {
  id: string
  ref: string
  creativeId: string
  serviceId: string
  date: DateKey
  start: number
  end: number
  clientId: string
  client: ClientDetails
  price: number
  deposit: number
  paidWith: 'card' | 'transfer'
  cardLast4?: string
  status: BookingStatus
  refund?: number
  rescheduledCount: number
  createdAt: string
  history: BookingEvent[]
}

export interface Hold {
  id: string
  creativeId: string
  serviceId: string
  date: DateKey
  start: number
  end: number
  tabId: string
  expiresAt: number
}

export interface Block {
  id: string
  creativeId: string
  date: DateKey
  start: number
  end: number
  note: string
}

export interface Database {
  version: 1
  seededOn: DateKey
  bookings: Booking[]
  holds: Hold[]
  blocks: Block[]
}

export type ApiErrorCode =
  | 'slot-taken'
  | 'slot-held'
  | 'hold-expired'
  | 'payment-failed'
  | 'network'
  | 'offline'
  | 'not-found'
  | 'not-allowed'

export class ApiError extends Error {
  readonly code: ApiErrorCode
  constructor(code: ApiErrorCode, message: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

export const isApiError = (e: unknown, code?: ApiErrorCode): e is ApiError =>
  e instanceof ApiError && (code === undefined || e.code === code)
