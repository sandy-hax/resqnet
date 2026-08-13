import { useEffect, useRef } from 'react'

export default function useWebSocket(onMessage: (evt: MessageEvent) => void, token?: string | null) {
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const base = import.meta.env.VITE_WS_URL ?? 'wss://resqnet-production.up.railway.app/ws'
    const url = token ? `${base}?token=${encodeURIComponent(token)}` : base
    const ws = new WebSocket(url)
    wsRef.current = ws
    ws.addEventListener('message', onMessage)
    ws.addEventListener('open', () => {
      // Send post-connect token auth so the backend can route events to this role.
      if (token) ws.send(JSON.stringify({ type: 'auth', token }))
    })
    return () => {
      ws.removeEventListener('message', onMessage)
      ws.close()
    }
  }, [onMessage, token])

  return wsRef
}
