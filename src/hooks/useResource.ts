import { useCallback, useEffect, useRef, useState } from 'react'
import { subscribe } from '../api/db'

export type Resource<T> =
  | { status: 'loading'; data?: T; error?: undefined }
  | { status: 'error'; data?: T; error: Error }
  | { status: 'ready'; data: T; error?: undefined }

interface Options {
  /** Refetch quietly when the shared database changes (another tab booked, etc). */
  live?: boolean
  enabled?: boolean
}

/**
 * Minimal fetch-state hook. Keeps the last good data while refetching so
 * live updates don't flash a skeleton, and ignores responses that arrive
 * after a newer request has started.
 */
export function useResource<T>(fetcher: () => Promise<T>, deps: unknown[], opts: Options = {}) {
  const { live = false, enabled = true } = opts
  const [state, setState] = useState<Resource<T>>({ status: 'loading' })
  const requestId = useRef(0)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const run = useCallback((quiet: boolean) => {
    const id = ++requestId.current
    if (!quiet) setState((s) => ({ status: 'loading', data: s.data }))
    fetcherRef.current().then(
      (data) => id === requestId.current && setState({ status: 'ready', data }),
      (error: Error) => {
        if (id !== requestId.current) return
        setState((s) => (quiet && s.status === 'ready' ? s : { status: 'error', error, data: s.data }))
      },
    )
  }, [])

  useEffect(() => {
    if (!enabled) return
    run(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, run, ...deps])

  useEffect(() => {
    if (!live || !enabled) return
    return subscribe((e) => {
      if (e.type === 'changed') run(true)
    })
  }, [live, enabled, run])

  const retry = useCallback(() => run(false), [run])
  const refresh = useCallback(() => run(true), [run])
  return { ...state, retry, refresh }
}
