/** Splits plain text into paragraphs on blank lines. */
export function toParagraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** About 220 words a minute, rounded up, never less than one. */
export function estimateReadTime(body: string): number {
  return Math.max(1, Math.ceil(countWords(body) / 220));
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/** "Ananya Singhvi" → "AS"; single names give one letter. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : '';
  return (first + last).toUpperCase() || '?';
}

/** URL-safe slug from a title. Falls back to "blog" when nothing usable remains. */
export function slugify(text: string, maxLength = 60): string {
  const slug = text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/, '');
  return slug || 'blog';
}

/** "1 reply" / "3 replies". */
export function plural(count: number, one: string, many: string): string {
  return `${count.toLocaleString('en-IN')} ${count === 1 ? one : many}`;
}
