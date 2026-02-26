import { useState, useEffect, useRef, useCallback } from 'react';

export interface BotEvent {
  event: string;
  projectId: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export function useWebSocket(projectId: string | null) {
  const [events, setEvents] = useState<BotEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onopen = () => setConnected(true);
    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      // Reconnect after 2s
      setTimeout(connect, 2000);
    };

    ws.onmessage = (msg) => {
      try {
        const event: BotEvent = JSON.parse(msg.data);
        if (!projectId || event.projectId === projectId) {
          setEvents((prev) => [...prev, event]);
        }
      } catch {}
    };

    wsRef.current = ws;
  }, [projectId]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  const clearEvents = useCallback(() => setEvents([]), []);

  return { events, connected, clearEvents };
}
