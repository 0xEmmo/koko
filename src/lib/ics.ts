import { toInstant, type DateKey } from './time'

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

const escape = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1')

/** RFC 5545 lines must be folded at 75 octets. */
function fold(line: string) {
  const out: string[] = []
  let rest = line
  while (rest.length > 74) {
    out.push(rest.slice(0, 74))
    rest = ' ' + rest.slice(74)
  }
  out.push(rest)
  return out.join('\r\n')
}

export function bookingToIcs(b: {
  uid: string
  title: string
  description: string
  location: string
  date: DateKey
  start: number
  end: number
  now?: Date
}) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Koko//Bookings//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${b.uid}@koko.app`,
    `DTSTAMP:${stamp(b.now ?? new Date())}`,
    `DTSTART:${stamp(toInstant(b.date, b.start))}`,
    `DTEND:${stamp(toInstant(b.date, b.end))}`,
    `SUMMARY:${escape(b.title)}`,
    `DESCRIPTION:${escape(b.description)}`,
    `LOCATION:${escape(b.location)}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escape(b.title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.map(fold).join('\r\n') + '\r\n'
}

export function downloadIcs(filename: string, contents: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: 'text/calendar;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
