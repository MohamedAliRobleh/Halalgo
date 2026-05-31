import 'dotenv/config';
import { createApp } from './app.js';
import { startSearchConsumer } from './kafka/consumer.js';

const PORT = process.env['PORT'] ?? 3006;
createApp().listen(PORT, () => {
  console.log(`[search-service] running on port ${PORT}`);
});

startSearchConsumer().catch(console.error);
