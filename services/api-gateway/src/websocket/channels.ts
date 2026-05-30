import { WebSocket } from 'ws';

const channelClients = new Map<string, Set<WebSocket>>();

export function subscribe(channel: string, ws: WebSocket): void {
  if (!channelClients.has(channel)) {
    channelClients.set(channel, new Set());
  }
  channelClients.get(channel)!.add(ws);
}

export function unsubscribe(channel: string, ws: WebSocket): void {
  channelClients.get(channel)?.delete(ws);
}

export function unsubscribeAll(ws: WebSocket): void {
  for (const clients of channelClients.values()) {
    clients.delete(ws);
  }
}

export function broadcastToChannel(channel: string, data: unknown): void {
  const clients = channelClients.get(channel);
  if (!clients) return;

  const message = JSON.stringify(data);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}
