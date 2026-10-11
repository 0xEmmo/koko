import { useState } from 'react'
import type { PaymentInput } from '../../api/client'
import { isApiError } from '../../api/types'
import { Icon } from '../../components/Icon'
import { formatNaira } from '../../lib/money'
import { TEST_CARDS, detectBrand, digitsOnly, formatCardNumber, formatExpiry, validateCard, type CardErrors } from '../../lib/payment'
import styles from './BookingPage.module.css'

interface Props {
  amount: number
  payee: string
  defaultName: string
  onPay: (p: PaymentInput) => Promise<void>
  onBack: () => void
  onHoldExpired: () => void
}

const brandLabel = { visa: 'Visa', mastercard: 'Mastercard', verve: 'Verve', unknown: '' }

export function PaymentStep({ amount, payee, defaultName, onPay, onBack, onHoldExpired }: Props) {
  const [method, setMethod] = useState<'card' | 'transfer'>('card')
  const [card, setCard] = useState({ number: '', expiry: '', cvv: '', name: defaultName })
  const [errors, setErrors] = useState<CardErrors>({})
  const [failure, setFailure] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const brand = detectBrand(card.number)

  const submit = async () => {
    setFailure(null)
    if (method === 'card') {
      const errs = validateCard(card)
      setErrors(errs)
      const first = Object.keys(errs)[0]
      if (first) {
        document.getElementById(`card-${first}`)?.focus()
        return
      }
    }
    setPending(true)
    try {
      await onPay(method === 'card' ? { method: 'card', number: card.number } : { method: 'transfer' })
    } catch (e) {
      if (isApiError(e, 'hold-expired')) return onHoldExpired()
      setFailure((e as Error).message)
    } finally {
      setPending(false)
    }
  }

  const field = (key: keyof typeof card, label: string, props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <div className="field">
      <label htmlFor={`card-${key}`}>{label}</label>
      <input
        id={`card-${key}`}
        className="input num"
        value={card[key]}
        aria-invalid={errors[key] ? true : undefined}
        aria-describedby={errors[key] ? `card-${key}-error` : undefined}
        {...props}
      />
      {errors[key] && (
        <span id={`card-${key}-error`} className="field-error">
          {errors[key]}
        </span>
      )}
    </div>
  )

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      aria-busy={pending}
    >
      <p className={styles.sub}>
        You pay <strong className="num">{formatNaira(amount)}</strong> now to secure the slot. The rest goes to {payee} on the day.
      </p>

      <fieldset className={styles.methods}>
        <legend className="sr-only">Payment method</legend>
        <label className={styles.method}>
          <input type="radio" name="method" checked={method === 'card'} onChange={() => setMethod('card')} />
          <Icon name="card" size={20} />
          <span>Card</span>
        </label>
        <label className={styles.method}>
          <input type="radio" name="method" checked={method === 'transfer'} onChange={() => setMethod('transfer')} />
          <Icon name="bank" size={20} />
          <span>Bank transfer</span>
        </label>
      </fieldset>

      {method === 'card' ? (
        <div className={styles.cardFields}>
          <div className={styles.cardNumber}>
            {field('number', 'Card number', {
              inputMode: 'numeric',
              autoComplete: 'cc-number',
              placeholder: '0000 0000 0000 0000',
              onChange: (e) => setCard({ ...card, number: formatCardNumber(e.target.value) }),
            })}
            {brand !== 'unknown' && <span className={styles.brand}>{brandLabel[brand]}</span>}
          </div>
          <div className={styles.twoUp}>
            {field('expiry', 'Expiry', {
              inputMode: 'numeric',
              autoComplete: 'cc-exp',
              placeholder: 'MM/YY',
              onChange: (e) => setCard({ ...card, expiry: formatExpiry(e.target.value) }),
            })}
            {field('cvv', 'CVV', {
              inputMode: 'numeric',
              autoComplete: 'cc-csc',
              placeholder: '123',
              maxLength: 4,
              onChange: (e) => setCard({ ...card, cvv: digitsOnly(e.target.value).slice(0, 4) }),
            })}
          </div>
          {field('name', 'Name on card', {
            autoComplete: 'cc-name',
            onChange: (e) => setCard({ ...card, name: e.target.value }),
          })}
          <p className={styles.testCards}>
            Demo only, nothing is charged. Use <button type="button" onClick={() => setCard({ ...card, number: TEST_CARDS.success, expiry: '09/29', cvv: '408' })}>a working test card</button> or{' '}
            <button type="button" onClick={() => setCard({ ...card, number: TEST_CARDS.declined, expiry: '09/29', cvv: '408' })}>one that gets declined</button>.
          </p>
        </div>
      ) : (
        <div className={styles.transfer}>
          <p>Send exactly this amount to the account below. It’s unique to this booking.</p>
          <dl>
            <div>
              <dt>Bank</dt>
              <dd>Wema Bank</dd>
            </div>
            <div>
              <dt>Account number</dt>
              <dd className="num">7812 345 690</dd>
            </div>
            <div>
              <dt>Account name</dt>
              <dd>Kòkó / {payee}</dd>
            </div>
            <div>
              <dt>Amount</dt>
              <dd className="num">{formatNaira(amount)}</dd>
            </div>
          </dl>
        </div>
      )}

      {failure && (
        <p className={styles.alert} role="alert">
          <Icon name="alert" size={18} />
          {failure}
        </p>
      )}

      <div className={styles.actions}>
        <button type="button" className="btn btn-ghost" onClick={onBack} disabled={pending}>
          Back
        </button>
        <button type="submit" className="btn btn-accent" disabled={pending}>
          {pending
            ? method === 'card'
              ? 'Confirming with your bank…'
              : 'Checking for your transfer…'
            : method === 'card'
              ? `Pay ${formatNaira(amount)}`
              : 'I’ve sent the money'}
        </button>
      </div>
    </form>
  )
}
