import { useId } from 'react'
import { groupByDayPart } from '../lib/availability'
import { formatClock } from '../lib/time'
import styles from './SlotPicker.module.css'

interface Props {
  slots: number[]
  value: number | null
  onChange: (start: number) => void
  durationMins: number
  label: string
}

/** Native radios underneath, so arrow keys and screen readers just work. */
export function SlotPicker({ slots, value, onChange, durationMins, label }: Props) {
  const name = useId()
  const groups = groupByDayPart(slots)
  return (
    <fieldset className={styles.slots}>
      <legend className="sr-only">{label}</legend>
      {groups.map((g) => (
        <div key={g.part} className={styles.group}>
          <p className={styles.part} aria-hidden>
            {g.part}
          </p>
          <div className={styles.options}>
            {g.slots.map((s) => (
              <label key={s} className={styles.slot}>
                <input
                  type="radio"
                  name={name}
                  value={s}
                  checked={value === s}
                  onChange={() => onChange(s)}
                  aria-label={`${formatClock(s)} to ${formatClock(s + durationMins)}`}
                />
                <span className="num">{formatClock(s)}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </fieldset>
  )
}
