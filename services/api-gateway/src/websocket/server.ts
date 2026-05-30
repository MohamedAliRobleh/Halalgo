import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import type { Server } from 'http';
import { subscribe, unsubscribeAll, broadcastToChannel } from './channels.js';
import { getSubscriber } from './redis-adapter.js';

interface WSMessage {
  type: 'subscribe' | 'unsubscribe';
  channel: string;
}

export function initWebSocketServer(httpServer: Server): WebSocketServer {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  const redisSub = getSubscriber();
  redisSub.psubscribe('*', (err) => {
    if (err) console.error('Redis psubscribe error:', err);
  });

  redisSub.on('pmessage', (_pattern, channel, message) => {
    try {
      const data = JSON.parse(message) as unknown;
      broadcastToChannel(channel, data);
    } catch {
      // Ignore malformed messages
    }
  });

  wss.on('connection', (ws: WebSocket, _req: IncomingMessage) => {
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as WSMessage;
        if (msg.type === 'subscribe') subscribe(msg.channel, ws);
        if (msg.type === 'unsubscribe') unsubscribeAll(ws);
      } catch {
        // Ignore malformed messages
      }
    });

    ws.on('close', () => unsubscribeAll(ws));
    ws.send(JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() }));
  });

  return wss;
}
