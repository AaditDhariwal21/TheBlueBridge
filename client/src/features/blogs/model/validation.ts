import { BLOG_LIMITS } from '../../../../../shared/limits';
import type { RichDoc } from './richText';
import type { NewBlogInput, NewQueryBlogInput } from './types';

/**
 * Input rules for posting, from shared/limits.ts (the server validates with the same
 * numbers). Client-side checks are for feedback only; the API validates again.
 */
export const BLOG_RULES = {
  titleMin: BLOG_LIMITS.titleMin,
  titleMax: BLOG_LIMITS.titleMax,
  bodyMin: BLOG_LIMITS.bodyMin,
  bodyMax: BLOG_LIMITS.bodyMax,
  maxCategories: BLOG_LIMITS.maxCategories,
} as const;

export const QUERY_BLOG_RULES = {
  titleMin: BLOG_LIMITS.queryTitleMin,
  titleMax: BLOG_LIMITS.queryTitleMax,
  descriptionMin: BLOG_LIMITS.queryDescriptionMin,
  descriptionMax: BLOG_LIMITS.queryDescriptionMax,
} as const;

export const COMMENT_MAX = BLOG_LIMITS.commentMax;

/** Feed search. Mirrors FEED_SEARCH_LIMITS in server/src/features/blogs/blogs.schemas.ts. */
export const FEED_SEARCH_RULES = {
  queryMin: 2,
  queryMax: 100,
  maxCategories: 10,
  debounceMs: 300,
} as const;

export interface BlogDraft {
  title: string;
  /** The editor's document; null until something is typed. */
  content: RichDoc | null;
  /** Its plain text, for counting and validation. */
  text: string;
  categoryIds: string[];
}

export type BlogDraftErrors = Partial<Record<keyof BlogDraft, string>>;

/** Collapses runs of spaces, trims, and keeps at most one blank line between paragraphs. */
export function normaliseText(value: string): string {
  return value
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const singleLine = (value: string) => value.replace(/\s+/g, ' ').trim();

export function validateBlogDraft(draft: BlogDraft): {
  values: NewBlogInput | null;
  errors: BlogDraftErrors;
} {
  const title = singleLine(draft.title);
  const body = draft.text.trim();
  const errors: BlogDraftErrors = {};

  if (!title) errors.title = 'Please add a title.';
  else if (title.length < BLOG_RULES.titleMin)
    errors.title = `A title needs at least ${BLOG_RULES.titleMin} characters.`;
  else if (title.length > BLOG_RULES.titleMax)
    errors.title = `Please keep the title under ${BLOG_RULES.titleMax} characters.`;

  if (draft.categoryIds.length === 0) errors.categoryIds = 'Please choose at least one category.';

  if (!body || !draft.content) errors.content = 'Please write your blog.';
  else if (body.length < BLOG_RULES.bodyMin)
    errors.content = `Your blog needs at least ${BLOG_RULES.bodyMin} characters. Add a little more.`;
  else if (body.length > BLOG_RULES.bodyMax)
    errors.content = `Please keep your blog under ${BLOG_RULES.bodyMax.toLocaleString('en-IN')} characters.`;

  const content = draft.content;
  const valid = Object.keys(errors).length === 0 && content !== null;
  return { values: valid ? { title, content, categoryIds: draft.categoryIds } : null, errors };
}

export interface QueryBlogDraft {
  categoryId: string;
  title: string;
  description: string;
}

export type QueryBlogDraftErrors = Partial<Record<keyof QueryBlogDraft, string>>;

export function validateQueryBlogDraft(draft: QueryBlogDraft): {
  values: NewQueryBlogInput | null;
  errors: QueryBlogDraftErrors;
} {
  const title = singleLine(draft.title);
  const description = normaliseText(draft.description);
  const errors: QueryBlogDraftErrors = {};
  const r = QUERY_BLOG_RULES;

  if (!draft.categoryId) errors.categoryId = 'Please choose a category.';

  if (!title) errors.title = 'Please add a title.';
  else if (title.length < r.titleMin) errors.title = `Use at least ${r.titleMin} characters.`;
  else if (title.length > r.titleMax)
    errors.title = `Keep the title under ${r.titleMax} characters.`;

  if (!description) errors.description = 'Say what people can ask here.';
  else if (description.length < r.descriptionMin)
    errors.description = `Use at least ${r.descriptionMin} characters.`;
  else if (description.length > r.descriptionMax)
    errors.description = `Keep this under ${r.descriptionMax} characters.`;

  const valid = Object.keys(errors).length === 0;
  return {
    values: valid ? { categoryId: draft.categoryId, title, description } : null,
    errors,
  };
}
