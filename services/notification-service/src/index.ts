import 'dotenv/config';
import { startNotificationConsumer } from './kafka/consumer.js';

console.log('[notification-service] starting Kafka consumer...');

startNotificationConsumer()
  .then(() => console.log('[notification-service] listening for events'))
  .catch((err) => {
    console.error('[notification-service] startup failed:', err);
    process.exit(1);
  });
