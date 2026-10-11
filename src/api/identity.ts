import { DEMO_CLIENT_ID } from './seed'

/** Bookings belong to the browser; holds belong to a single tab. */
export function clientId() {
  return DEMO_CLIENT_ID
}

export function tabId() {
  let id = sessionStorage.getItem('koko.tab')
  if (!id) {
    id = `tab_${Math.random().toString(36).slice(2, 10)}`
    sessionStorage.setItem('koko.tab', id)
  }
  return id
}
