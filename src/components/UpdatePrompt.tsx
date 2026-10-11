import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useToast } from './toast'

/** Offer a reload when a new build has been cached, instead of swapping code under people mid-booking. */
export function UpdatePrompt() {
  const toast = useToast()
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  useEffect(() => {
    if (needRefresh) toast('A new version of Kòkó is ready', { action: { label: 'Reload', onClick: () => updateServiceWorker(true) } })
  }, [needRefresh, toast, updateServiceWorker])

  return null
}
