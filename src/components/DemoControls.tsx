import { useState } from 'react'
import { resetDb } from '../api/db'
import { getNetworkMode, setNetworkMode, type NetworkMode } from '../api/network'
import { Dialog } from './Dialog'
import { useToast } from './toast'
import styles from './DemoControls.module.css'

const modes: { id: NetworkMode; label: string; detail: string }[] = [
  { id: 'normal', label: 'Normal', detail: '200–500ms per request' },
  { id: 'slow', label: 'Slow 3G', detail: '2–3.5s per request, to see loading states' },
  { id: 'flaky', label: 'Flaky', detail: 'About a third of requests fail' },
  { id: 'offline', label: 'Offline', detail: 'Every request fails' },
]

/** Lets a reviewer poke at loading, error and offline states without devtools. */
export function DemoControls({ label = 'Demo controls' }: { label?: string }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<NetworkMode>(getNetworkMode)
  const toast = useToast()

  return (
    <>
      <button type="button" className={styles.trigger} onClick={() => setOpen(true)}>
        {label}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Demo controls">
        <fieldset className={styles.group}>
          <legend className="eyebrow">Simulated network</legend>
          {modes.map((m) => (
            <label key={m.id} className={styles.option}>
              <input
                type="radio"
                name="network"
                value={m.id}
                checked={mode === m.id}
                onChange={() => {
                  setMode(m.id)
                  setNetworkMode(m.id)
                }}
              />
              <span>
                <strong>{m.label}</strong>
                <span className={styles.detail}>{m.detail}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <div className={styles.reset}>
          <p>Put every diary back to its starting state and remove bookings you’ve made.</p>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              resetDb()
              toast('Demo data reset', { tone: 'ok' })
              setOpen(false)
            }}
          >
            Reset demo data
          </button>
        </div>
        <p className={styles.cards}>
          Test cards: <code>4084 0840 8408 4081</code> succeeds, <code>4000 0000 0000 0002</code> is declined.
        </p>
      </Dialog>
    </>
  )
}
