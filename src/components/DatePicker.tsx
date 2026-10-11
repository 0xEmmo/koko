import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import {
  addDays,
  addMonths,
  formatDateLong,
  formatMonth,
  parseDateKey,
  toDateKey,
  weekday,
  type DateKey,
} from '../lib/time'
import { monthGrid } from '../lib/calendar'
import { Icon } from './Icon'
import styles from './DatePicker.module.css'

interface Props {
  value: DateKey | null
  onChange: (date: DateKey) => void
  /** Number of free slots per day; days missing or at 0 can't be picked. */
  slotCounts: Map<DateKey, number>
  min: DateKey
  max: DateKey
  today: DateKey
  loading?: boolean
}

const WEEKDAYS = [
  ['Mon', 'Monday'],
  ['Tue', 'Tuesday'],
  ['Wed', 'Wednesday'],
  ['Thu', 'Thursday'],
  ['Fri', 'Friday'],
  ['Sat', 'Saturday'],
  ['Sun', 'Sunday'],
] as const

const monthStart = (key: DateKey) => {
  const { year, month } = parseDateKey(key)
  return toDateKey(year, month, 1)
}

const clamp = (d: DateKey, min: DateKey, max: DateKey) => (d < min ? min : d > max ? max : d)

/**
 * Follows the WAI-ARIA date picker grid pattern: one tab stop, arrow keys
 * move by day/week, Home/End to the week's edges, Page Up/Down by month.
 * Unavailable days stay focusable so keyboard users can move through them,
 * but they can't be chosen.
 */
export function DatePicker({ value, onChange, slotCounts, min, max, today, loading }: Props) {
  const labelId = useId()
  const [focused, setFocused] = useState<DateKey>(value ?? min)
  const [month, setMonth] = useState(monthStart(value ?? min))
  const shouldFocus = useRef(false)
  const grid = useRef<HTMLTableElement>(null)

  useEffect(() => {
    if (!shouldFocus.current) return
    shouldFocus.current = false
    grid.current?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`)?.focus()
  }, [focused, month])

  const moveTo = (date: DateKey) => {
    const next = clamp(date, min, max)
    shouldFocus.current = true
    setFocused(next)
    if (monthStart(next) !== month) setMonth(monthStart(next))
  }

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, date: DateKey) => {
    const offset = (weekday(date) + 6) % 7
    const map: Record<string, () => DateKey> = {
      ArrowLeft: () => addDays(date, -1),
      ArrowRight: () => addDays(date, 1),
      ArrowUp: () => addDays(date, -7),
      ArrowDown: () => addDays(date, 7),
      Home: () => addDays(date, -offset),
      End: () => addDays(date, 6 - offset),
      PageUp: () => addMonths(date, -1),
      PageDown: () => addMonths(date, 1),
    }
    const fn = map[e.key]
    if (!fn) return
    e.preventDefault()
    moveTo(fn())
  }

  const canPrev = month > monthStart(min)
  const canNext = month < monthStart(max)
  const showMonth = (delta: number) => {
    const next = addMonths(month, delta)
    setMonth(next)
    const firstFree = [...slotCounts].find(([d, n]) => n > 0 && monthStart(d) === next)?.[0]
    setFocused(clamp(firstFree ?? next, min, max))
  }

  return (
    <div className={styles.picker} aria-busy={loading}>
      <div className={styles.head}>
        <h3 id={labelId} className={styles.month} aria-live="polite">
          {formatMonth(month)}
        </h3>
        <div className={styles.arrows}>
          <button type="button" onClick={() => showMonth(-1)} disabled={!canPrev} aria-label="Previous month">
            <Icon name="left" size={18} />
          </button>
          <button type="button" onClick={() => showMonth(1)} disabled={!canNext} aria-label="Next month">
            <Icon name="right" size={18} />
          </button>
        </div>
      </div>
      <table ref={grid} role="grid" aria-labelledby={labelId} className={styles.grid}>
        <thead>
          <tr>
            {WEEKDAYS.map(([short, long]) => (
              <th key={short} scope="col" abbr={long}>
                {short}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {monthGrid(month).map((week, i) => (
            <tr key={i}>
              {week.map((date, j) => {
                if (!date) return <td key={j} />
                const count = slotCounts.get(date) ?? 0
                const inRange = date >= min && date <= max
                const available = inRange && count > 0
                const selected = date === value
                const label = `${formatDateLong(date)}${date === today ? ', today' : ''}, ${
                  available ? `${count} ${count === 1 ? 'time' : 'times'} free` : 'nothing free'
                }`
                return (
                  <td key={date} role="gridcell" aria-selected={selected}>
                    <button
                      type="button"
                      data-date={date}
                      className={styles.day}
                      data-today={date === today}
                      data-available={available}
                      data-busy={available && count <= 2}
                      tabIndex={date === focused ? 0 : -1}
                      aria-disabled={!available}
                      aria-label={label}
                      onFocus={() => setFocused(date)}
                      onKeyDown={(e) => onKeyDown(e, date)}
                      onClick={() => available && onChange(date)}
                    >
                      <span className="num">{parseDateKey(date).day}</span>
                      {available && <span className={styles.dot} aria-hidden />}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className={styles.legend}>
        <span>
          <span className={styles.dot} aria-hidden /> Free times
        </span>
        <span>
          <span className={`${styles.dot} ${styles.dotBusy}`} aria-hidden /> Nearly full
        </span>
      </p>
    </div>
  )
}
