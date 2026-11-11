import { z } from 'zod';

/**
 * Formatted blog bodies: a small, allow-listed subset of the TipTap /
 * ProseMirror JSON document format. Anything outside the list is rejected,
 * unknown attributes are dropped, and links must be http(s). The client renders
 * the stored document with React elements only, never as HTML.
 *
 * Allowed: paragraphs, headings (levels 2–3), bullet and numbered lists, block
 * quotes, line breaks; bold, italic, underline, strikethrough and links.
 */

export type RichMark =
  { type: 'bold' | 'italic' | 'underline' | 'strike' } | { type: 'link'; attrs: { href: string } };

export type RichInline =
  { type: 'text'; text: string; marks?: RichMark[] | undefined } | { type: 'hardBreak' };

export interface RichListItem {
  type: 'listItem';
  content: RichBlock[];
}

export type RichBlock =
  | { type: 'paragraph'; content?: RichInline[] | undefined }
  | { type: 'heading'; attrs: { level: 2 | 3 }; content?: RichInline[] | undefined }
  | { type: 'bulletList'; content: RichListItem[] }
  | {
      type: 'orderedList';
      attrs?: { start?: number | undefined } | undefined;
      content: RichListItem[];
    }
  | { type: 'blockquote'; content: RichBlock[] };

export interface RichDoc {
  type: 'doc';
  content: RichBlock[];
}

export const RICH_TEXT_LIMITS = {
  /** Serialized size of the whole document. */
  maxJsonLength: 100_000,
  /** Nesting of blocks inside lists and quotes. */
  maxDepth: 8,
} as const;

const httpUrl = z
  .string()
  .max(2048)
  .refine((value) => {
    try {
      const { protocol } = new URL(value);
      return protocol === 'https:' || protocol === 'http:';
    } catch {
      return false;
    }
  });

const mark: z.ZodType<RichMark> = z.union([
  z.object({ type: z.enum(['bold', 'italic', 'underline', 'strike']) }),
  z.object({ type: z.literal('link'), attrs: z.object({ href: httpUrl }) }),
]);

const inline: z.ZodType<RichInline> = z.union([
  z.object({
    type: z.literal('text'),
    text: z.string().min(1),
    marks: z.array(mark).max(5).optional(),
  }),
  z.object({ type: z.literal('hardBreak') }),
]);

const inlineContent = z.array(inline).optional();

const listItem: z.ZodType<RichListItem> = z.lazy(() =>
  z.object({ type: z.literal('listItem'), content: z.array(block).min(1) }),
);

const block: z.ZodType<RichBlock> = z.lazy(() =>
  z.union([
    z.object({ type: z.literal('paragraph'), content: inlineContent }),
    z.object({
      type: z.literal('heading'),
      attrs: z.object({ level: z.union([z.literal(2), z.literal(3)]) }),
      content: inlineContent,
    }),
    z.object({ type: z.literal('bulletList'), content: z.array(listItem).min(1) }),
    z.object({
      type: z.literal('orderedList'),
      attrs: z.object({ start: z.number().int().min(0).max(10_000).optional() }).optional(),
      content: z.array(listItem).min(1),
    }),
    z.object({ type: z.literal('blockquote'), content: z.array(block).min(1) }),
  ]),
);

const docSchema: z.ZodType<RichDoc> = z.object({
  type: z.literal('doc'),
  content: z.array(block).min(1),
});

/** Deepest chain of nested `content` arrays; checked before the (recursive) schema runs. */
function depthOf(value: unknown, depth = 0): number {
  if (typeof value !== 'object' || value === null || !('content' in value)) return depth;
  const { content } = value;
  if (!Array.isArray(content)) return depth;
  let deepest = depth + 1;
  for (const child of content) deepest = Math.max(deepest, depthOf(child, depth + 1));
  return deepest;
}

/** The sanitized document, or null if it is too big, too deep or not allowed. */
export function parseRichDoc(value: unknown): RichDoc | null {
  // JSON.stringify(undefined) is undefined: a missing field is simply not a document.
  const json = JSON.stringify(value) as string | undefined;
  if (json === undefined || json.length > RICH_TEXT_LIMITS.maxJsonLength) return null;
  // Block nesting plus doc → block → inline levels.
  if (depthOf(value) > RICH_TEXT_LIMITS.maxDepth + 2) return null;
  const result = docSchema.safeParse(value);
  return result.success ? result.data : null;
}

/**
 * The words, for excerpts, read time and length limits: blocks separated by a
 * blank line, list items and line breaks by a newline.
 */
export function toPlainText(doc: RichDoc): string {
  return blocksToText(doc.content).trim();
}

function blocksToText(blocks: readonly RichBlock[]): string {
  return blocks
    .map((b) => {
      switch (b.type) {
        case 'paragraph':
        case 'heading':
          return inlineToText(b.content ?? []);
        case 'bulletList':
        case 'orderedList':
          return b.content.map((item) => blocksToText(item.content)).join('\n');
        case 'blockquote':
          return blocksToText(b.content);
      }
    })
    .map((text) => text.trim())
    .filter(Boolean)
    .join('\n\n');
}

function inlineToText(nodes: readonly RichInline[]): string {
  return nodes.map((node) => (node.type === 'text' ? node.text : '\n')).join('');
}
