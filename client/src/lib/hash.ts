/** A small, stable, non-negative hash of a string (e.g. an id), for deterministic visuals. */
export function hashString(text: string): number {
  let hash = 0;
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return Math.abs(hash);
}
