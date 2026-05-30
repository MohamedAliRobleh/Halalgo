import Redis from 'ioredis';

let publisher: Redis | null = null;
let subscriber: Redis | null = null;

function getRedisUrl(): string {
  const url = process.env['REDIS_CACHE_URL'];
  if (!url) throw new Error('Missing REDIS_CACHE_URL environment variable');
  return url;
}

export function getPublisher(): Redis {
  if (!publisher) publisher = new Redis(getRedisUrl());
  return publisher;
}

export function getSubscriber(): Redis {
  if (!subscriber) subscriber = new Redis(getRedisUrl());
  return subscriber;
}

export async function publishToChannel(channel: string, data: unknown): Promise<void> {
  const pub = getPublisher();
  await pub.publish(channel, JSON.stringify(data));
}
