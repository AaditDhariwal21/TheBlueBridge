import { sql, type RawBuilder } from 'kysely';
import { z } from 'zod';

/**
 * Keyset pagination on (created_at, id), newest first. The cursor is opaque to
 * clients: base64url JSON of the last row's sort key. created_at travels as
 * Postgres text, so microseconds survive the round trip (a JS Date would lose
 * them and skip or repeat rows).
 */
export interface Cursor {
  /** `created_at::text` of the last row on the page. */
  createdAt: string;
  id: string;
}

/** Postgres timestamptz text output, e.g. "2026-11-10 09:41:07.123456+05:30". */
const PG_TIMESTAMP = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{1,6})?[+-]\d{2}(:\d{2})?$/;

const payload = z.strictObject({ t: z.string().regex(PG_TIMESTAMP), id: z.uuid() });

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify({ t: cursor.createdAt, id: cursor.id })).toString('base64url');
}

/** Query-string `cursor` parameter: decodes and validates, or fails validation. */
export const cursorParam = z
  .string()
  .max(200)
  .transform((value, ctx): Cursor => {
    const parsed = payload.safeParse(safeJson(Buffer.from(value, 'base64url').toString('utf8')));
    if (!parsed.success) {
      ctx.addIssue({ code: 'custom', message: 'Invalid cursor.' });
      return z.NEVER;
    }
    return { createdAt: parsed.data.t, id: parsed.data.id };
  });

/** `(createdAt, id) < cursor`, the condition for "rows after this page". */
export function keysetBefore(createdAt: string, id: string, cursor: Cursor): RawBuilder<boolean> {
  return sql<boolean>`(${sql.ref(createdAt)}, ${sql.ref(id)}) < (${cursor.createdAt}::timestamptz, ${cursor.id}::uuid)`;
}

/**
 * Splits a `limit + 1` result into the page and the next cursor (null on the
 * last page). `key` reads the sort key from a row.
 */
export function paginate<T>(
  rows: T[],
  limit: number,
  key: (row: T) => Cursor,
): { items: T[]; nextCursor: string | null } {
  const items = rows.slice(0, limit);
  const last = items.at(-1);
  return {
    items,
    nextCursor: rows.length > limit && last !== undefined ? encodeCursor(key(last)) : null,
  };
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
