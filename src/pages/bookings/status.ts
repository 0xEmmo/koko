import type { BookingStatus } from '../../api/types'

export const statusLabel: Record<BookingStatus, { text: string; tone: string }> = {
  confirmed: { text: 'Confirmed', tone: 'pill-ok' },
  completed: { text: 'Completed', tone: '' },
  cancelled: { text: 'Cancelled', tone: 'pill-danger' },
  'no-show': { text: 'Missed', tone: 'pill-warn' },
}
