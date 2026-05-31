import 'dotenv/config';
import { createApp } from './app.js';

const PORT = process.env['PORT'] ?? 3004;
createApp().listen(PORT, () => {
  console.log(`[payment-service] running on port ${PORT}`);
});
