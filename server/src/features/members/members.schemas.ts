import { z } from 'zod';

import { USER_ROLES } from '../../db/schema.ts';
import { cursorCodec } from '../../lib/cursor.ts';
import { normalizeSingleLine } from '../../lib/text.ts';

/** The directory's sort key of the last row: role rank, lowercased name, id. */
export const directoryCursor = cursorCodec(
  z.strictObject({
    k: z.number().int().min(0).max(2),
    n: z.string().max(400),
    id: z.uuid(),
  }),
);
export type DirectoryCursor = z.output<typeof directoryCursor.param>;

/** Directory search limits. The client mirrors these (client/src/features/members/api.ts). */
export const DIRECTORY_SEARCH_LIMITS = { queryMin: 2, queryMax: 100 } as const;

/** GET /members?q&roles (comma-separated roles, any of them)&cursor&limit */
export const directoryQuery = z.strictObject({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: directoryCursor.param.optional(),
  q: z
    .string()
    .transform(normalizeSingleLine)
    .pipe(
      z
        .string()
        .min(DIRECTORY_SEARCH_LIMITS.queryMin, {
          error: `Type at least ${DIRECTORY_SEARCH_LIMITS.queryMin} characters.`,
        })
        .max(DIRECTORY_SEARCH_LIMITS.queryMax, {
          error: `Keep the search under ${DIRECTORY_SEARCH_LIMITS.queryMax} characters.`,
        }),
    )
    .optional(),
  roles: z
    .string()
    .max(100)
    .transform((value) => [...new Set(value.split(',').filter(Boolean))])
    .pipe(
      z
        .array(z.enum(USER_ROLES, { error: 'Choose roles from the list.' }))
        .min(1, { error: 'Choose at least one role.' }),
    )
    .optional(),
});

/**
 * GET /admin/members: everyone, in directory order. `q` matches anywhere in the name or the
 * occupation, case-insensitively.
 */
export const adminMembersQuery = z.strictObject({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: directoryCursor.param.optional(),
  q: z
    .string()
    .transform(normalizeSingleLine)
    .pipe(z.string().max(100, { error: 'Keep the search under 100 characters.' }))
    .transform((value) => value || undefined)
    .optional(),
  status: z.enum(['pending', 'approved'], { error: 'Choose pending or approved.' }).optional(),
  role: z.enum(USER_ROLES, { error: 'Choose a role from the list.' }).optional(),
});
