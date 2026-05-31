import 'dotenv/config';
import { createApp } from './app.js';
import { startAnalyticsConsumer } from './kafka/consumer.js';

const PORT = process.env['PORT'] ?? 3007;
createApp().listen(PORT, () => {
  console.log(`[analytics-service] running on port ${PORT}`);
});

startAnalyticsConsumer().catch(console.error);
