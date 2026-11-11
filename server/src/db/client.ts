import { readFileSync } from 'node:fs';

import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

import type { DatabaseConfig } from '../config/env.ts';
import type { Database, Db } from './schema.ts';

/**
 * One pg pool per process. With DATABASE_SSL_CA_PATH set, the server certificate
 * is verified against that CA (verify-full); otherwise the URL's sslmode applies.
 */
export function createPool(config: DatabaseConfig, onError: (error: Error) => void): Pool {
  const pool = new Pool({
    connectionString: config.url,
    max: config.poolMax,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ...(config.sslCaPath !== undefined && {
      ssl: { ca: readFileSync(config.sslCaPath, 'utf8'), rejectUnauthorized: true },
    }),
  });
  // An idle client can error (e.g. the server restarts). Without a listener that crashes the process.
  pool.on('error', onError);
  return pool;
}

export function createDatabase(pool: Pool): Db {
  return new Kysely<Database>({ dialect: new PostgresDialect({ pool }) });
}
