import { useEffect, useState } from 'react'

/** Seconds left until `deadline` (ms epoch), ticking once a second. */
export function useCountdown(deadline: number | null) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!deadline) return
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [deadline])
  if (!deadline) return null
  return Math.max(0, Math.ceil((deadline - now) / 1000))
}

export const formatCountdown = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
