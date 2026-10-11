import { createContext, useContext } from 'react'

export interface Toast {
  id: number
  message: string
  tone: 'neutral' | 'ok' | 'danger'
  action?: { label: string; onClick: () => void }
}

export type Push = (message: string, opts?: Omit<Partial<Toast>, 'id' | 'message'>) => void

export const ToastContext = createContext<Push>(() => {})

export const useToast = () => useContext(ToastContext)
