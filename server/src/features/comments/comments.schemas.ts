import { z } from 'zod';

import { BLOG_LIMITS } from '../../../../shared/limits.ts';
import { multilineText } from '../../lib/validation.ts';

export const createCommentBody = z.strictObject({
  /** The comment being replied to; null (or absent) for a top-level comment or query. */
  parentId: z.uuid({ error: 'That comment can’t be replied to.' }).nullable().default(null),
  body: multilineText(1, BLOG_LIMITS.commentMax, 'Write something first.'),
});

export type CreateCommentInput = z.output<typeof createCommentBody>;
