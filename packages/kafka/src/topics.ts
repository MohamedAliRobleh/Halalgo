export const KAFKA_TOPICS = {
  ORDER_CREATED: 'order.created',
  ORDER_STATUS_UPDATED: 'order.status.updated',
  ORDER_COMPLETED: 'order.completed',
  ORDER_CANCELLED: 'order.cancelled',
  DRIVER_LOCATION_UPDATED: 'driver.location.updated',
  DRIVER_AVAILABILITY_CHANGED: 'driver.availability.changed',
  PAYMENT_COMPLETED: 'payment.completed',
  PAYMENT_REFUNDED: 'payment.refunded',
  STORE_STATUS_CHANGED: 'store.status.changed',
  REVIEW_CREATED: 'review.created',
  NOTIFICATION_SEND: 'notification.send',
} as const;

export type KafkaTopic = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS];
