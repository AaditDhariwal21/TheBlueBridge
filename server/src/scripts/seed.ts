/** `npm run db:seed -w server`: inserts the categories and their colours (idempotent). */
import { loadDatabaseConfig } from '../config/env.ts';
import { createDatabase, createPool } from '../db/client.ts';
import { seedCategories } from '../db/seed.ts';

const db = createDatabase(
  createPool(loadDatabaseConfig(), (error) => {
    console.error(error.message);
  }),
);
try {
  console.log(`Categories inserted or updated: ${await seedCategories(db)}`);
} finally {
  await db.destroy();
}
