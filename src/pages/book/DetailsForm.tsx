import type { ClientDetails } from '../../api/types'
import type { DetailErrors } from './validateDetails'
import styles from './BookingPage.module.css'

interface Props {
  value: ClientDetails
  errors: DetailErrors
  onChange: (v: ClientDetails) => void
  onSubmit: () => void
  notesHint: string
}

const fields: {
  key: keyof ClientDetails
  label: string
  type: string
  autoComplete: string
  inputMode?: 'tel' | 'email'
  hint?: string
}[] = [
  { key: 'name', label: 'Full name', type: 'text', autoComplete: 'name' },
  { key: 'phone', label: 'Phone (WhatsApp is fine)', type: 'tel', autoComplete: 'tel', inputMode: 'tel', hint: 'Nigerian mobile number' },
  { key: 'email', label: 'Email', type: 'email', autoComplete: 'email', inputMode: 'email', hint: 'For your receipt' },
]

export function DetailsForm({ value, errors, onChange, onSubmit, notesHint }: Props) {
  return (
    <form
      id="details-form"
      className={styles.form}
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      {fields.map((f) => {
        const error = errors[f.key]
        const describedBy = [f.hint && `hint-${f.key}`, error && `error-${f.key}`].filter(Boolean).join(' ') || undefined
        return (
          <div key={f.key} className="field">
            <label htmlFor={`field-${f.key}`}>{f.label}</label>
            {f.hint && (
              <span id={`hint-${f.key}`} className="hint">
                {f.hint}
              </span>
            )}
            <input
              id={`field-${f.key}`}
              className="input"
              type={f.type}
              inputMode={f.inputMode}
              autoComplete={f.autoComplete}
              value={value[f.key]}
              onChange={(e) => onChange({ ...value, [f.key]: e.target.value })}
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy}
              required
            />
            {error && (
              <span id={`error-${f.key}`} className="field-error">
                {error}
              </span>
            )}
          </div>
        )
      })}
      <div className="field">
        <label htmlFor="field-notes">
          Notes <span className="hint">(optional)</span>
        </label>
        <textarea
          id="field-notes"
          className="input"
          value={value.notes}
          placeholder={notesHint}
          onChange={(e) => onChange({ ...value, notes: e.target.value })}
          aria-invalid={errors.notes ? true : undefined}
          aria-describedby={errors.notes ? 'error-notes' : undefined}
          maxLength={600}
        />
        {errors.notes && (
          <span id="error-notes" className="field-error">
            {errors.notes}
          </span>
        )}
      </div>
    </form>
  )
}
