import type { ReactNode } from 'react';

import { cn } from '../../../../lib/cn';
import {
  isSafeHref,
  type RichBlock,
  type RichDoc,
  type RichInline,
  type RichMark,
} from '../../model/richText';

/**
 * Renders a stored blog document as React elements. No HTML strings are
 * involved, so nothing in a document can run as code; links must be http(s)
 * and open in a new tab without access to this page. Styles: `.rich-text`.
 */
export function RichText({ doc, className }: { doc: RichDoc; className?: string }) {
  return <div className={cn('rich-text', className)}>{doc.content.map(renderBlock)}</div>;
}

function renderBlock(block: RichBlock, key: number): ReactNode {
  switch (block.type) {
    case 'paragraph':
      // Empty paragraphs are just the editor's spacing; the CSS spaces blocks evenly.
      return block.content?.length ? <p key={key}>{renderInline(block.content)}</p> : null;
    case 'heading':
      return block.attrs.level === 2 ? (
        <h2 key={key}>{renderInline(block.content)}</h2>
      ) : (
        <h3 key={key}>{renderInline(block.content)}</h3>
      );
    case 'bulletList':
      return (
        <ul key={key}>
          {block.content.map((item, i) => (
            <li key={i}>{item.content.map(renderBlock)}</li>
          ))}
        </ul>
      );
    case 'orderedList':
      return (
        <ol key={key} start={block.attrs?.start}>
          {block.content.map((item, i) => (
            <li key={i}>{item.content.map(renderBlock)}</li>
          ))}
        </ol>
      );
    case 'blockquote':
      return <blockquote key={key}>{block.content.map(renderBlock)}</blockquote>;
  }
}

function renderInline(nodes: readonly RichInline[] = []): ReactNode[] {
  return nodes.map((node, i) =>
    node.type === 'hardBreak' ? (
      <br key={i} />
    ) : (
      <span key={i}>{applyMarks(node.text, node.marks ?? [])}</span>
    ),
  );
}

function applyMarks(text: string, marks: readonly RichMark[]): ReactNode {
  return marks.reduce<ReactNode>((inner, mark) => {
    switch (mark.type) {
      case 'bold':
        return <strong>{inner}</strong>;
      case 'italic':
        return <em>{inner}</em>;
      case 'underline':
        return <u>{inner}</u>;
      case 'strike':
        return <s>{inner}</s>;
      case 'link':
        return isSafeHref(mark.attrs.href) ? (
          <a href={mark.attrs.href} target="_blank" rel="noopener noreferrer nofollow ugc">
            {inner}
          </a>
        ) : (
          inner
        );
    }
  }, text);
}
