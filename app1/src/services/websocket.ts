export type WSEventType = 'sos.status_changed' | 'alert.broadcast' | 'content.published' | 'connection.status';

export interface WSMessage {
  event: WSEventType;
  payload: any;
  timestamp: string;
}

type EventCallback = (msg: WSMessage) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private isConnected: boolean = false;
  private reconnectInterval: any = null;
  private mockInterval: any = null;

  constructor() {
    this.connect();
  }

  public connect() {
    const token = localStorage.getItem('resqnet_token');
    const base = import.meta.env.VITE_WS_URL ?? 'wss://resqnet-production.up.railway.app/ws';
    const wsUrl = base + (token ? `${base.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}` : '');
    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[ResQNet WS] Connected to live backend WebSocket:', wsUrl);
        this.isConnected = true;
        if (token) {
          this.ws?.send(JSON.stringify({ type: 'auth', token }));
        }
        this.emitStatusChange(true);
        if (this.reconnectInterval) {
          clearInterval(this.reconnectInterval);
          this.reconnectInterval = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (!parsed || !parsed.event) return;
          // Backend sends {event, data}; normalize to {event, payload} used by screens.
          const message: WSMessage = {
            event: parsed.event,
            payload: parsed.payload ?? parsed.data ?? {},
            timestamp: parsed.timestamp ?? new Date().toISOString(),
          };
          this.notifyListeners(message.event, message);
        } catch (e) {
          console.error('[ResQNet WS] Error parsing message:', e);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.emitStatusChange(false);
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        // Backend WebSocket offline, fallback to simulation mode
        this.isConnected = false;
        this.emitStatusChange(false);
      };
    } catch (err) {
      this.isConnected = false;
      this.emitStatusChange(false);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (!this.reconnectInterval) {
      this.reconnectInterval = setInterval(() => {
        this.connect();
      }, 10000);
    }
  }

  private emitStatusChange(connected: boolean) {
    this.notifyListeners('connection.status', {
      event: 'connection.status',
      payload: { connected },
      timestamp: new Date().toISOString(),
    });
  }

  public subscribe(event: WSEventType, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscriber function
    return () => {
      const set = this.listeners.get(event);
      if (set) {
        set.delete(callback);
      }
    };
  }

  public notifyListeners(event: WSEventType, message: WSMessage) {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach((cb) => cb(message));
    }
  }

  // Method to manually emit mock events for frontend demo testing & simulation
  public triggerMockStatusChange(sosId: string, status: string, assignedTeam?: any) {
    const msg: WSMessage = {
      event: 'sos.status_changed',
      payload: {
        sos_id: sosId,
        status: status,
        assigned_team: assignedTeam || null,
        updated_at: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };
    this.notifyListeners('sos.status_changed', msg);
  }

  public triggerMockBroadcast(title: string, message: string, severity: 'HIGH' | 'MEDIUM' | 'INFO' = 'HIGH') {
    const msg: WSMessage = {
      event: 'alert.broadcast',
      payload: {
        id: `alert-${Date.now()}`,
        title,
        message,
        severity,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };
    this.notifyListeners('alert.broadcast', msg);
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }
}

export const wsService = new WebSocketService();
