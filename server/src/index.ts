import { createApp } from './app.ts';
import { loadServerConfig } from './config/env.ts';
import { createDatabase, createPool } from './db/client.ts';
import { pendingMigrations } from './db/migrator.ts';
import { createSupabaseTokenVerifier } from './lib/accessToken.ts';
import { createSupabaseIdentity } from './lib/identity.ts';
import { createLogger } from './lib/logger.ts';

const config = (() => {
  try {
    return loadServerConfig();
  } catch (error) {
    // Fail fast: the message lists variable names only, never values.
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
})();

const logger = createLogger(config);
const pool = createPool(config.database, (err) => {
  logger.error({ err }, 'idle database client error');
});
const db = createDatabase(pool);

// Code and schema must match: never serve requests against a database that is
// missing migrations this code relies on (doubles as a connectivity check).
const pending = await pendingMigrations(pool).catch((error: unknown) => {
  logger.fatal({ err: error }, 'Cannot reach the database. Check DATABASE_URL.');
  process.exit(1);
});
if (pending.length > 0) {
  logger.fatal(
    `Database is missing migrations: ${pending.join(', ')}. Run "npm run db:migrate -w server", then restart the server.`,
  );
  process.exit(1);
}

const app = createApp({
  trustProxy: config.trustProxy,
  corsOrigins: config.corsOrigins,
  logger,
  db,
  identity: createSupabaseIdentity(config.supabase),
  verifyAccessToken: createSupabaseTokenVerifier(config.supabase.url),
});

const server = app.listen(config.port, config.host, () => {
  logger.info(`API listening on http://${config.host}:${config.port} (${config.env})`);
});

// Conservative timeouts so slow or idle clients can't hold connections open.
server.requestTimeout = 30_000;
server.headersTimeout = 15_000;
server.keepAliveTimeout = 5_000;

// Graceful shutdown: stop accepting connections, finish in-flight requests, close the pool.
function shutdown(signal: string): void {
  logger.info(`${signal} received, shutting down`);
  server.close(() => {
    void db.destroy().finally(() => process.exit(0));
  });
  server.closeIdleConnections();
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.once('SIGINT', () => {
  shutdown('SIGINT');
});
process.once('SIGTERM', () => {
  shutdown('SIGTERM');
});
