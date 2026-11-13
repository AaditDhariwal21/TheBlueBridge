import { z } from 'zod';

import { cursorCodec, cursorParam, pgTimestamp, type Cursor } from '../../lib/cursor.ts';
import { parseRichDoc, toPlainText, type RichDoc } from '../../lib/richText.ts';
import { toPrefixTsQuery } from '../../lib/searchQuery.ts';
import { normalizeSingleLine } from '../../lib/text.ts';
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

/** GET /me/blogs and /me/comments. */
export const listFeedQuery = z.strictObject({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  cursor: cursorParam.optional(),
});

/** Feed search limits. The client mirrors these (client/src/features/blogs/model/validation.ts). */
export const FEED_SEARCH_LIMITS = { queryMin: 2, queryMax: 100, maxCategories: 10 } as const;

/** A search result's sort key: relevance (numeric text, exact), then created_at and id. */
export const searchCursor = cursorCodec(
  z.strictObject({ r: z.string().regex(/^\d{1,9}(\.\d{1,6})?$/), t: pgTimestamp, id: z.uuid() }),
);
export type SearchCursor = z.output<typeof searchCursor.param>;

/**
 * What GET /blogs asks for. Without q the Feed is newest first, exactly as before; with q
 * it is ranked by relevance. `categoryIds` (any of them) narrows either.
 * A query with nothing searchable in it (`tsquery: null`) matches nothing.
 */
export type FeedRequest = { limit: number; categoryIds: string[] } & (
  | { order: 'latest'; cursor: Cursor | null }
  | { order: 'relevance'; tsquery: string | null; cursor: SearchCursor | null }
);

/** GET /blogs?limit&cursor&q&categories (comma-separated category ids). */
export const feedQuery = z
  .strictObject({
    limit: z.coerce.number().int().min(1).max(50).default(10),
    cursor: z.string().max(600).optional(),
    q: z
      .string()
      .transform(normalizeSingleLine)
      .pipe(
        z
          .string()
          .min(FEED_SEARCH_LIMITS.queryMin, {
            error: `Type at least ${FEED_SEARCH_LIMITS.queryMin} characters.`,
          })
          .max(FEED_SEARCH_LIMITS.queryMax, {
            error: `Keep the search under ${FEED_SEARCH_LIMITS.queryMax} characters.`,
          }),
      )
      .optional(),
    categories: z
      .string()
      .max(1_000)
      .transform((value) => [...new Set(value.split(',').filter(Boolean))])
      .pipe(
        z
          .array(z.uuid({ error: 'Choose categories from the list.' }))
          .min(1, { error: 'Choose at least one category.' })
          .max(FEED_SEARCH_LIMITS.maxCategories, { error: 'Choose fewer categories.' }),
      )
      .optional(),
  })
  .transform((input, ctx): FeedRequest => {
    const base = { limit: input.limit, categoryIds: input.categories ?? [] };
    const invalidCursor = () => {
      ctx.addIssue({ code: 'custom', path: ['cursor'], message: 'Invalid cursor.' });
      return z.NEVER;
    };
    if (input.q === undefined) {
      if (input.cursor === undefined) return { ...base, order: 'latest', cursor: null };
      const cursor = cursorParam.safeParse(input.cursor);
      return cursor.success ? { ...base, order: 'latest', cursor: cursor.data } : invalidCursor();
    }
    const tsquery = toPrefixTsQuery(input.q);
    if (input.cursor === undefined) return { ...base, order: 'relevance', tsquery, cursor: null };
    const cursor = searchCursor.param.safeParse(input.cursor);
    return cursor.success
      ? { ...base, order: 'relevance', tsquery, cursor: cursor.data }
      : invalidCursor();
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
