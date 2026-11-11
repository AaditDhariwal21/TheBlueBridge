import { z } from 'zod';

import { cursorParam } from '../../lib/cursor.ts';
import { parseRichDoc, toPlainText, type RichDoc } from '../../lib/richText.ts';
import { multilineText, singleLineText } from '../../lib/validation.ts';

/** Input limits. The client mirrors these (client/src/features/blogs/model/validation.ts). */
export const BLOG_LIMITS = {
  titleMin: 10,
  titleMax: 140,
  bodyMin: 80,
  bodyMax: 12_000,
  maxCategories: 5,
  queryTitleMin: 3,
  queryTitleMax: 80,
  queryDescriptionMin: 10,
  queryDescriptionMax: 500,
} as const;

/** GET /blogs and GET /me/blogs, /me/comments. */
export const listFeedQuery = z.strictObject({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  cursor: cursorParam.optional(),
});

/**
 * The editor's document: sanitized against the allow-list, then measured by its
 * plain text. Output: the clean document and that text.
 */
const blogContent = z.unknown().transform((value, ctx): { content: RichDoc; body: string } => {
  const content = parseRichDoc(value);
  if (!content) {
    ctx.addIssue({ code: 'custom', message: 'This blog has formatting that can’t be saved.' });
    return z.NEVER;
  }
  const body = toPlainText(content);
  const length = body.length;
  if (length < BLOG_LIMITS.bodyMin || length > BLOG_LIMITS.bodyMax) {
    ctx.addIssue({
      code: 'custom',
      message:
        length === 0
          ? 'Write your blog.'
          : length < BLOG_LIMITS.bodyMin
            ? `Use at least ${BLOG_LIMITS.bodyMin} characters.`
            : `Keep this under ${BLOG_LIMITS.bodyMax.toLocaleString('en-IN')} characters.`,
    });
    return z.NEVER;
  }
  return { content, body };
});

export const createBlogBody = z.strictObject({
  title: singleLineText(BLOG_LIMITS.titleMin, BLOG_LIMITS.titleMax, 'Give your blog a title.'),
  content: blogContent,
  categoryIds: z
    .array(z.uuid({ error: 'Choose categories from the list.' }), {
      error: 'Choose at least one category.',
    })
    .min(1, { error: 'Choose at least one category.' })
    .max(BLOG_LIMITS.maxCategories, { error: 'Choose fewer categories.' })
    .refine((ids) => new Set(ids).size === ids.length, { error: 'Choose each category once.' }),
});

export const createQueryBlogBody = z.strictObject({
  categoryId: z.uuid({ error: 'Choose a category.' }),
  title: singleLineText(
    BLOG_LIMITS.queryTitleMin,
    BLOG_LIMITS.queryTitleMax,
    'Give the Query Blog a title.',
  ),
  description: multilineText(
    BLOG_LIMITS.queryDescriptionMin,
    BLOG_LIMITS.queryDescriptionMax,
    'Describe what people can ask here.',
  ),
});

export type CreateBlogInput = z.output<typeof createBlogBody>;
export type CreateQueryBlogInput = z.output<typeof createQueryBlogBody>;
