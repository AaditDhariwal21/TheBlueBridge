import { createServer } from 'node:http';

import { app } from './app.ts';
import { config } from './config.ts';

const server = createServer((req, res) => {
  void app(req, res);
});

// Conservative timeouts so slow or idle clients can't hold connections open.
server.requestTimeout = 30_000;
server.headersTimeout = 15_000;
server.keepAliveTimeout = 5_000;

server.listen(config.port, config.host, () => {
  console.log(`API listening on http://${config.host}:${config.port} (${config.env})`);
});

// Graceful shutdown: stop accepting connections, let in-flight requests finish.
function shutdown(signal: string): void {
  console.log(`${signal} received, shutting down…`);
  server.close(() => process.exit(0));
  server.closeIdleConnections();
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.once('SIGINT', () => {
  shutdown('SIGINT');
});
process.once('SIGTERM', () => {
  shutdown('SIGTERM');
});
