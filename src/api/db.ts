import { lagosNow } from '../lib/time'
import { seedDatabase } from './seed'
import type { Database } from './types'

/**
 * The "server" is localStorage. It is shared by every tab on the origin,
 * which is exactly what we need to reproduce two people (or one person with
 * two tabs) racing for the same slot. Writes go through the Web Locks API so
 * a read-check-write in one tab can't interleave with another tab's.
 */
const KEY = 'koko.db.v1'
const LOCK = 'koko.db'
const channelName = 'koko'

export type DbEvent =
  | { type: 'changed' }
  | { type: 'booking-created'; bookingId: string; creativeId: string }
  | { type: 'booking-cancelled'; bookingId: string; creativeId: string }

let channel: BroadcastChannel | null = null
const localListeners = new Set<(e: DbEvent) => void>()

function getChannel() {
  if (channel || typeof BroadcastChannel === 'undefined') return channel
  channel = new BroadcastChannel(channelName)
  channel.onmessage = (msg: MessageEvent<DbEvent>) => localListeners.forEach((l) => l(msg.data))
  return channel
}

export function subscribe(listener: (e: DbEvent) => void) {
  getChannel()
  localListeners.add(listener)
  return () => {
    localListeners.delete(listener)
  }
}

function emit(events: DbEvent[]) {
  for (const e of events) {
    getChannel()?.postMessage(e)
    localListeners.forEach((l) => l(e))
  }
}

function load(): Database {
  const raw = localStorage.getItem(KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Database
      if (parsed.version === 1) return parsed
    } catch {
      // corrupted or from an old build, fall through and reseed
    }
  }
  const fresh = seedDatabase(lagosNow().date)
  localStorage.setItem(KEY, JSON.stringify(fresh))
  return fresh
}

function purgeExpiredHolds(db: Database, now = Date.now()) {
  db.holds = db.holds.filter((h) => h.expiresAt > now)
  return db
}

export function readDb(): Database {
  return purgeExpiredHolds(load())
}

async function withLock<T>(fn: () => T): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request(LOCK, async () => fn())
  }
  return fn()
}

/**
 * Run a read-modify-write against the database. `mutate` may throw to abort
 * without saving; any events it returns are broadcast after the write.
 */
export function transact<T>(mutate: (db: Database) => { result: T; events?: DbEvent[] }): Promise<T> {
  return withLock(() => {
    const db = readDb()
    const { result, events = [] } = mutate(db)
    localStorage.setItem(KEY, JSON.stringify(db))
    emit([{ type: 'changed' }, ...events])
    return result
  })
}

export function resetDb() {
  localStorage.removeItem(KEY)
  load()
  emit([{ type: 'changed' }])
}

if (typeof window !== 'undefined') {
  // Covers browsers without BroadcastChannel and edits from devtools.
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) localListeners.forEach((l) => l({ type: 'changed' }))
  })
}
