/**
 * A formatted blog body: the allow-listed document the editor produces and the
 * API stores (mirror of server/src/lib/richText.ts, which sanitizes it).
 * Rendered with React elements only (components/article/RichText.tsx).
 */

export type RichMark =
  { type: 'bold' | 'italic' | 'underline' | 'strike' } | { type: 'link'; attrs: { href: string } };

export type RichInline = { type: 'text'; text: string; marks?: RichMark[] } | { type: 'hardBreak' };

export interface RichListItem {
  type: 'listItem';
  content: RichBlock[];
}

export type RichBlock =
  | { type: 'paragraph'; content?: RichInline[] }
  | { type: 'heading'; attrs: { level: 2 | 3 }; content?: RichInline[] }
  | { type: 'bulletList'; content: RichListItem[] }
  | { type: 'orderedList'; attrs?: { start?: number }; content: RichListItem[] }
  | { type: 'blockquote'; content: RichBlock[] };

export interface RichDoc {
  type: 'doc';
  content: RichBlock[];
}

/** Only http(s) links are ever rendered or created (the server enforces the same). */
export function isSafeHref(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}
