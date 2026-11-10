/** Joins class names, skipping falsy values. Deliberately tiny; no merging. */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}
