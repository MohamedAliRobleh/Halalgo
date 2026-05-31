import { useEffect, useRef } from 'react';

const WS_URL = process.env['EXPO_PUBLIC_WS_URL'] ?? 'ws://localhost:3000/ws';

type MessageHandler = (data: unknown) => void;

export function useWebSocket(channel: string, onMessage: MessageHandler): void {
  const wsRef = useRef<WebSocket | null>(null);
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  useEffect(() => {
    if (!channel) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'subscribe', channel }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as unknown;
        handlerRef.current(data);
      } catch {
        // ignore malformed
      }
    };

    ws.onclose = () => {
      setTimeout(() => { wsRef.current = new WebSocket(WS_URL); }, 3000);
    };

    return () => {
      try {
        ws.send(JSON.stringify({ type: 'unsubscribe', channel }));
        ws.close();
      } catch {
        // ignore if already closed
      }
    };
  }, [channel]);
}
