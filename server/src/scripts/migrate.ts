/** `npm run db:migrate -w server`: applies pending SQL migrations to DATABASE_URL. */
import { loadDatabaseConfig } from '../config/env.ts';
import { createPool } from '../db/client.ts';
import { runMigrations } from '../db/migrator.ts';

const pool = createPool(loadDatabaseConfig(), (error) => {
  console.error(error.message);
});
try {
  const applied = await runMigrations(pool);
  console.log(applied.length ? `Applied: ${applied.join(', ')}` : 'Already up to date.');
} finally {
  await pool.end();
}
