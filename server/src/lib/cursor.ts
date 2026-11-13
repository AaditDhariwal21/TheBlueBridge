import { sql, type RawBuilder } from 'kysely';
import { z } from 'zod';

/**
 * Keyset pagination. A cursor is opaque to clients: base64url JSON of the last row's sort
 * key, validated against a schema when it comes back. Timestamps travel as Postgres text
 * (`created_at::text`), so microseconds survive the round trip (a JS Date would lose them
 * and skip or repeat rows).
 */

/** Postgres timestamptz text output, e.g. "2026-11-10 09:41:07.123456+05:30". */
export const pgTimestamp = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{1,6})?[+-]\d{2}(:\d{2})?$/);

/** A cursor format: `encode` for responses, `param` to decode and validate `?cursor=`. */
export function cursorCodec<T>(schema: z.ZodType<T>) {
  return {
    encode: (value: T): string => Buffer.from(JSON.stringify(value)).toString('base64url'),
    param: z
      .string()
      .max(600)
      .transform((value, ctx): T => {
        const decoded = safeJson(Buffer.from(value, 'base64url').toString('utf8'));
        const parsed = schema.safeParse(decoded);
        if (!parsed.success) {
          ctx.addIssue({ code: 'custom', message: 'Invalid cursor.' });
          return z.NEVER;
        }
        return parsed.data;
      }),
  };
}

/** The common order: newest first on (created_at, id). */
export interface Cursor {
  /** `created_at::text` of the last row on the page. */
  createdAt: string;
  id: string;
}

const timeCursor = cursorCodec(z.strictObject({ t: pgTimestamp, id: z.uuid() }));

export function encodeCursor(cursor: Cursor): string {
  return timeCursor.encode({ t: cursor.createdAt, id: cursor.id });
}

/** Query-string `cursor` parameter: decodes and validates, or fails validation. */
export const cursorParam = timeCursor.param.transform(({ t, id }): Cursor => ({
  createdAt: t,
  id,
}));

/** `(createdAt, id) < cursor`, the condition for "rows after this page". */
export function keysetBefore(createdAt: string, id: string, cursor: Cursor): RawBuilder<boolean> {
  return sql<boolean>`(${sql.ref(createdAt)}, ${sql.ref(id)}) < (${cursor.createdAt}::timestamptz, ${cursor.id}::uuid)`;
}

/**
 * Splits a `limit + 1` result into the page and the next cursor (null on the last page).
 * `cursorOf` encodes a row's sort key.
 */
export function paginate<T>(
  rows: T[],
  limit: number,
  cursorOf: (row: T) => string,
): { items: T[]; nextCursor: string | null } {
  const items = rows.slice(0, limit);
  const last = items.at(-1);
  return {
    items,
    nextCursor: rows.length > limit && last !== undefined ? cursorOf(last) : null,
  };
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
