/** Normalises Nigerian mobile numbers to +234 format, or returns null. */
export function normaliseNigerianPhone(input: string): string | null {
  const d = input.replace(/[\s\-()]/g, '')
  const m = /^(?:\+?234|0)([789][01]\d{8})$/.exec(d)
  return m ? `+234${m[1]}` : null
}

export function formatNigerianPhone(e164: string) {
  const local = '0' + e164.slice(4)
  return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`
}

export const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())
