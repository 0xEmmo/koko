import { ApiError } from './types'

export type NetworkMode = 'normal' | 'slow' | 'flaky' | 'offline'

const KEY = 'koko.network'

export function getNetworkMode(): NetworkMode {
  const fromUrl = new URLSearchParams(window.location.search).get('network')
  const value = fromUrl ?? localStorage.getItem(KEY)
  return value === 'slow' || value === 'flaky' || value === 'offline' ? value : 'normal'
}

export function setNetworkMode(mode: NetworkMode) {
  localStorage.setItem(KEY, mode)
  window.dispatchEvent(new Event('koko:network'))
}

const LATENCY: Record<NetworkMode, [number, number]> = {
  normal: [180, 520],
  slow: [2200, 3600],
  flaky: [300, 1200],
  offline: [150, 300],
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Pretend to talk to a server. Tests set `koko.latency` to 0 so they don't
 * wait on random delays.
 */
export async function simulateRequest() {
  const mode = getNetworkMode()
  const override = localStorage.getItem('koko.latency')
  const [min, max] = LATENCY[mode]
  await sleep(override !== null ? Number(override) : min + Math.random() * (max - min))

  if (mode === 'offline' || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
    throw new ApiError('offline', 'You’re offline. Check your connection and try again.')
  }
  if (mode === 'flaky' && Math.random() < 0.35) {
    throw new ApiError('network', 'The connection dropped before we heard back. Please try again.')
  }
}
