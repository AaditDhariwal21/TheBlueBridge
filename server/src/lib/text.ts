/** Normalization for user-written text, applied before validation and storage. */

/** Collapses every run of whitespace to one space and trims. For titles and names. */
export function normalizeSingleLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/**
 * For bodies and comments: unify line endings, tidy spaces within each line,
 * keep at most one blank line between paragraphs, and trim.
 * Mirrors the client's normaliseText (client/src/features/blogs/model/validation.ts).
 */
export function normalizeMultiline(value: string): string {
  return value
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
