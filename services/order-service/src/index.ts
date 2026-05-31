import 'dotenv/config';
import { createApp } from './app.js';

const PORT = process.env['PORT'] ?? 3002;
createApp().listen(PORT, () => {
  console.log(`[order-service] running on port ${PORT}`);
});
