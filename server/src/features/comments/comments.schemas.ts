import { z } from 'zod';

import { multilineText } from '../../lib/validation.ts';

export const COMMENT_MAX = 2_000;

export const createCommentBody = z.strictObject({
  /** The comment being replied to; null (or absent) for a top-level comment or query. */
  parentId: z.uuid({ error: 'That comment can’t be replied to.' }).nullable().default(null),
  body: multilineText(1, COMMENT_MAX, 'Write something first.'),
});

export type CreateCommentInput = z.output<typeof createCommentBody>;
