import { useCallback, useSyncExternalStore } from 'react'

const KEY = 'koko.saved'
const EVENT = 'koko:saved'

function read(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

let cache = read()
let cacheRaw = localStorage.getItem(KEY)

function snapshot() {
  const raw = localStorage.getItem(KEY)
  if (raw !== cacheRaw) {
    cacheRaw = raw
    cache = read()
  }
  return cache
}

function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => e.key === KEY && cb()
  window.addEventListener(EVENT, cb)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(EVENT, cb)
    window.removeEventListener('storage', onStorage)
  }
}

/** Saved creatives, persisted and synced across tabs. */
export function useSaved() {
  const saved = useSyncExternalStore(subscribe, snapshot, () => [])
  const toggle = useCallback((id: string) => {
    const current = read()
    const next = current.includes(id) ? current.filter((x) => x !== id) : [id, ...current]
    localStorage.setItem(KEY, JSON.stringify(next))
    window.dispatchEvent(new Event(EVENT))
    return next.includes(id)
  }, [])
  return { saved, isSaved: (id: string) => saved.includes(id), toggle }
}
