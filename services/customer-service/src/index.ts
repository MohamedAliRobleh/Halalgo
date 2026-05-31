import 'dotenv/config';
import { createApp } from './app.js';

const PORT = process.env['PORT'] ?? 3008;
createApp().listen(PORT, () => {
  console.log(`[customer-service] running on port ${PORT}`);
});
