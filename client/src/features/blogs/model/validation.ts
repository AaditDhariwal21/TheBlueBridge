import { isCategoryId } from './categories';
import type { CategoryId, NewBlogInput } from './types';

/**
 * Input rules for posting. Client-side checks are for feedback only; a real
 * API must validate again.
 */
export const BLOG_RULES = {
  titleMin: 10,
  titleMax: 140,
  bodyMin: 80,
  bodyMax: 12_000,
} as const;

export const COMMENT_MAX = 2_000;

export interface BlogDraft {
  title: string;
  body: string;
  categoryId: CategoryId | '';
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

export function validateBlogDraft(draft: BlogDraft): {
  values: NewBlogInput | null;
  errors: BlogDraftErrors;
} {
  const title = draft.title.replace(/\s+/g, ' ').trim();
  const body = normaliseText(draft.body);
  const errors: BlogDraftErrors = {};

  if (!title) errors.title = 'Please add a title.';
  else if (title.length < BLOG_RULES.titleMin)
    errors.title = `A title needs at least ${BLOG_RULES.titleMin} characters.`;
  else if (title.length > BLOG_RULES.titleMax)
    errors.title = `Please keep the title under ${BLOG_RULES.titleMax} characters.`;

  if (!draft.categoryId || !isCategoryId(draft.categoryId))
    errors.categoryId = 'Please choose a category.';

  if (!body) errors.body = 'Please write your blog.';
  else if (body.length < BLOG_RULES.bodyMin)
    errors.body = `Your blog needs at least ${BLOG_RULES.bodyMin} characters. Add a little more.`;
  else if (body.length > BLOG_RULES.bodyMax)
    errors.body = `Please keep your blog under ${BLOG_RULES.bodyMax.toLocaleString('en-IN')} characters.`;

  const valid = !errors.title && !errors.body && !errors.categoryId && draft.categoryId !== '';
  return {
    values: valid ? { title, body, categoryId: draft.categoryId as CategoryId } : null,
    errors,
  };
}
