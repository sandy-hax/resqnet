import { useEffect, useRef, useState } from 'react';
import type { WsMessage } from '@/types';

export const WS_BASE_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000/ws';

type Listener = (message: WsMessage) => void;

const listeners = new Set<Listener>();
let socket: WebSocket | null = null;
let socketToken: string | null = null;
let isConnected = false;
const stateListeners = new Set<() => void>();

function emitState() {
  stateListeners.forEach((fn) => fn());
}

function connect() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }
  const url = socketToken ? `${WS_BASE_URL}?token=${encodeURIComponent(socketToken)}` : WS_BASE_URL;
  const ws = new WebSocket(url);
  socket = ws;

  ws.addEventListener('open', () => {
    isConnected = true;
    emitState();
    if (socketToken) {
      ws.send(JSON.stringify({ type: 'auth', token: socketToken }));
    }
  });

  ws.addEventListener('message', (event) => {
    try {
      const message = JSON.parse(event.data) as WsMessage;
      listeners.forEach((l) => l(message));
    } catch {
      // ignore non-JSON frames
    }
  });

  ws.addEventListener('close', () => {
    if (socket !== ws) return;
    isConnected = false;
    emitState();
    socket = null;
    setTimeout(connect, 3000);
  });

  ws.addEventListener('error', () => {
    ws.close();
  });
}

function ensureConnection(token: string | null) {
  if (socketToken !== token) {
    socketToken = token;
    if (socket) {
      const old = socket;
      socket = null;
      old.close();
    }
  }
  connect();
}

/**
 * Native WebSocket client for the Authority command center.
 * Backed by a module-level singleton so every consumer (sidebar,
 * layout, pages) shares ONE connection to ws://localhost:8000/ws.
 * Connects with the AUTHORITY JWT so the backend routes live
 * `sos.created` / `sos.status_changed` / `assignment.responded`
 * events to this dashboard. Auto-reconnects on unexpected drops.
 */
export function useWebSocket(token: string | null) {
  const [connected, setConnected] = useState(isConnected);

  useEffect(() => {
    ensureConnection(token);
    const onState = () => setConnected(isConnected);
    stateListeners.add(onState);
    setConnected(isConnected);
    return () => {
      stateListeners.delete(onState);
    };
  }, [token]);

  const subscribe = useRef((listener: Listener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }).current;

  const send = useRef((payload: unknown) => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
    }
  }).current;

  return { connected, subscribe, send };
}
