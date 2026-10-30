import { useEffect, useRef } from 'react'

const backend = import.meta.env.VITE_BACKEND_URL 

export function useOrderSocket(onEvent: (payload: { event?: string; order_id?: number }) => void) {
  const cb = useRef(onEvent)
  cb.current = onEvent

  useEffect(() => {
    const wsUrl = backend.replace(/^http/, 'ws').replace(/\/$/, '') + '/ws/orders'
    const ws = new WebSocket(wsUrl)
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data as string)
        cb.current(data)
      } catch {
        /* ignore */
      }
    }
    return () => {
      ws.close()
    }
  }, [])
}
