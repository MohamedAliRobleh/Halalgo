import { createConsumer, KAFKA_TOPICS } from '@halalgo/kafka';
import { sendPushNotification } from '../expo/push.js';
import type {
  KafkaEvent,
  NotificationSendPayload,
  OrderStatusUpdatedPayload,
  OrderCreatedPayload,
} from '@halalgo/types';

const STATUS_MESSAGES: Record<string, string> = {
  confirmed:  'Your order has been confirmed!',
  preparing:  'The restaurant is preparing your order.',
  ready:      'Your order is ready for pickup!',
  picked_up:  'Your driver has picked up your order.',
  delivered:  'Your order has been delivered. Enjoy!',
  cancelled:  'Your order has been cancelled.',
};

export async function startNotificationConsumer(): Promise<void> {
  await createConsumer(
    [KAFKA_TOPICS.NOTIFICATION_SEND, KAFKA_TOPICS.ORDER_STATUS_UPDATED, KAFKA_TOPICS.ORDER_CREATED],
    async (event: KafkaEvent<unknown>, raw) => {
      const topic = raw.topic;

      if (topic === KAFKA_TOPICS.NOTIFICATION_SEND) {
        const payload = event.payload as NotificationSendPayload;
        await sendPushNotification(payload);
        return;
      }

      if (topic === KAFKA_TOPICS.ORDER_CREATED) {
        const payload = event.payload as OrderCreatedPayload;
        await sendPushNotification({
          clerkUserId: payload.clerkCustomerId,
          title:       'Order placed!',
          body:        `Order #${payload.orderId.slice(-6).toUpperCase()} received.`,
          data:        { orderId: payload.orderId, type: 'order_created' },
        });
        return;
      }

      if (topic === KAFKA_TOPICS.ORDER_STATUS_UPDATED) {
        const payload = event.payload as OrderStatusUpdatedPayload;
        const body = STATUS_MESSAGES[payload.newStatus] ?? 'Order status updated.';
        await sendPushNotification({
          clerkUserId: payload.clerkCustomerId,
          title:       'Order update',
          body,
          data:        { orderId: payload.orderId, status: payload.newStatus, type: 'order_status' },
        });
      }
    },
  );
}
