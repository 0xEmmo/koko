const naira = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  currencyDisplay: 'narrowSymbol',
  maximumFractionDigits: 0,
})

/** Prices are whole naira everywhere in the app. */
export function formatNaira(amount: number) {
  return naira.format(Math.round(amount))
}

/** Compact form for tight spaces: ₦85k, ₦1.2m */
export function formatNairaShort(amount: number) {
  if (amount >= 1_000_000) return `₦${trim(amount / 1_000_000)}m`
  if (amount >= 1_000) return `₦${trim(amount / 1_000)}k`
  return `₦${amount}`
}

const trim = (n: number) => (Math.round(n * 10) / 10).toString()
