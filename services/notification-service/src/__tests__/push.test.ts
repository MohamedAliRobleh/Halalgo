import { describe, it, expect, vi } from 'vitest';
import { sendPushNotification, chunkTokens } from '../expo/push.js';

vi.mock('expo-server-sdk', () => {
  const MockExpo = vi.fn().mockImplementation(() => ({
    chunkPushNotifications: vi.fn().mockImplementation((messages: unknown[]) => [messages]),
    sendPushNotificationsAsync: vi.fn().mockResolvedValue([{ status: 'ok', id: 'notif-1' }]),
  }));
  MockExpo.isExpoPushToken = vi.fn().mockReturnValue(true);
  return { default: MockExpo, Expo: MockExpo };
});

vi.mock('../db/index.js', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { token: 'ExponentPushToken[test123]', platform: 'ios' },
        ]),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
  },
  pushTokens: {},
  notifications: {},
}));

describe('sendPushNotification', () => {
  it('sends push notification without throwing', async () => {
    await expect(sendPushNotification({
      clerkUserId: 'user_123',
      title: 'Order confirmed!',
      body: 'Your order is being prepared.',
      data: { orderId: 'order-1' },
    })).resolves.toBeUndefined();
  });

  it('returns early if no push tokens for user', async () => {
    const { db } = await import('../db/index.js');
    (db.select as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });
    await expect(sendPushNotification({
      clerkUserId: 'no_tokens_user',
      title: 'Test',
      body: 'Test body',
      data: {},
    })).resolves.toBeUndefined();
  });
});

describe('chunkTokens', () => {
  it('splits tokens into chunks of given size', () => {
    const tokens = Array.from({ length: 250 }, (_, i) => `token-${i}`);
    const chunks = chunkTokens(tokens, 100);
    expect(chunks).toHaveLength(3);
    expect(chunks[0]!.length).toBe(100);
    expect(chunks[2]!.length).toBe(50);
  });

  it('returns single chunk for small arrays', () => {
    const chunks = chunkTokens(['a', 'b'], 100);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.length).toBe(2);
  });
});
