import 'dotenv/config';
import http from 'http';
import { createApp } from './app.js';
import { initWebSocketServer } from './websocket/server.js';

const PORT = process.env['PORT'] ?? 3000;

const app = createApp();
const httpServer = http.createServer(app);

initWebSocketServer(httpServer);

httpServer.listen(PORT, () => {
  console.log(`[api-gateway] running on port ${PORT}`);
});

process.on('SIGTERM', () => {
  httpServer.close(() => process.exit(0));
});
