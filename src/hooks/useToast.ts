import { useState, useCallback, useRef } from 'react'

export interface Toast {
  id: string
  message: string
  action?: { label: string; fn: () => void }
  type: 'info' | 'success' | 'error'
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const dismiss = useCallback((id: string) => {
    clearTimeout(timers.current[id])
    setToasts((t: Toast[]) => t.filter(x => x.id !== id))
  }, [])

  const show = useCallback((msg: string, opts?: Partial<Omit<Toast, 'id' | 'message'>>, duration = 4500) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const toast: Toast = { id, message: msg, type: 'info', ...opts }
    setToasts((t: Toast[]) => [...t.slice(-2), toast])
    timers.current[id] = setTimeout(() => dismiss(id), duration)
    return id
  }, [dismiss])

  return { toasts, show, dismiss }
}
