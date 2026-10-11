import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { subscribe } from '../api/db'

export type Resource<T> =
  | { status: 'loading'; data?: T; error?: undefined }
  | { status: 'error'; data?: T; error: Error }
  | { status: 'ready'; data: T; error?: undefined }

interface Options {
  /** Refetch quietly when the shared database changes (another tab booked, etc). */
  live?: boolean
}

interface Settled<T> {
  key: string
  data?: T
  error?: Error
  pending: boolean
}

/**
 * Minimal fetch-state hook. Loading is derived from whether the last
 * settled request matches the current deps, so changing filters keeps the
 * previous data on screen (dimmed) instead of flashing a skeleton. Responses
 * that arrive after a newer request has started are ignored.
 */
export function useResource<T>(fetcher: () => Promise<T>, deps: unknown[], opts: Options = {}) {
  const key = JSON.stringify(deps)
  const [state, setState] = useState<Settled<T>>({ key: '', pending: true })
  const requestId = useRef(0)
  const fetcherRef = useRef(fetcher)

  useLayoutEffect(() => {
    fetcherRef.current = fetcher
  })

  const run = useCallback((forKey: string) => {
    const id = ++requestId.current
    fetcherRef.current().then(
      (data) => id === requestId.current && setState({ key: forKey, data, pending: false }),
      (error: Error) => id === requestId.current && setState((s) => ({ key: forKey, data: s.data, error, pending: false })),
    )
  }, [])

  useEffect(() => run(key), [key, run])

  useEffect(() => {
    if (!opts.live) return
    return subscribe((e) => {
      if (e.type !== 'changed') return
      const id = ++requestId.current
      fetcherRef.current().then(
        (data) => id === requestId.current && setState({ key, data, pending: false }),
        () => {
          // a failed background refresh keeps showing what we had
        },
      )
    })
  }, [opts.live, key])

  const retry = useCallback(() => {
    setState((s) => ({ ...s, error: undefined, pending: true }))
    run(key)
  }, [key, run])

  let resource: Resource<T>
  if (state.key !== key || state.pending) resource = { status: 'loading', data: state.data }
  else if (state.error) resource = { status: 'error', error: state.error, data: state.data }
  else resource = { status: 'ready', data: state.data as T }

  const refresh = useCallback(() => run(key), [key, run])

  return { ...resource, retry, refresh }
}
