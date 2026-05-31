import 'dotenv/config';
import { createApp } from './app.js';

const PORT = process.env['PORT'] ?? 3003;
createApp().listen(PORT, () => {
  console.log(`[driver-service] running on port ${PORT}`);
});
