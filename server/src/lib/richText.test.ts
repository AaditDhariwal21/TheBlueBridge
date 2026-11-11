import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseRichDoc, toPlainText } from './richText.ts';

const text = (value: string, marks?: unknown[]) => ({
  type: 'text',
  text: value,
  ...(marks && { marks }),
});
const paragraph = (...content: unknown[]) => ({ type: 'paragraph', content });
const doc = (...content: unknown[]) => ({ type: 'doc', content });

describe('rich text documents', () => {
  it('accepts the allowed formatting and extracts readable text', () => {
    const parsed = parseRichDoc(
      doc(
        { type: 'heading', attrs: { level: 2 }, content: [text('Lessons')] },
        paragraph(text('Be ', [{ type: 'bold' }]), text('kind', [{ type: 'italic' }])),
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [paragraph(text('One'))] },
            { type: 'listItem', content: [paragraph(text('Two'))] },
          ],
        },
        {
          type: 'blockquote',
          content: [paragraph(text('Quote'), { type: 'hardBreak' }, text('More'))],
        },
      ),
    );
    assert.ok(parsed);
    assert.equal(toPlainText(parsed), 'Lessons\n\nBe kind\n\nOne\nTwo\n\nQuote\nMore');
  });

  it('drops attributes it does not know', () => {
    const parsed = parseRichDoc(
      doc(
        paragraph(
          text('site', [
            { type: 'link', attrs: { href: 'https://example.org', target: '_blank', class: 'x' } },
          ]),
        ),
      ),
    );
    assert.deepEqual(parsed?.content[0], {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'site',
          marks: [{ type: 'link', attrs: { href: 'https://example.org' } }],
        },
      ],
    });
  });

  it('rejects unsafe links, unknown nodes and unknown marks', () => {
    const link = (href: string) => doc(paragraph(text('x', [{ type: 'link', attrs: { href } }])));
    assert.equal(parseRichDoc(link('javascript:alert(1)')), null);
    assert.equal(parseRichDoc(link('data:text/html,hi')), null);
    assert.equal(parseRichDoc(doc({ type: 'image', attrs: { src: 'https://x' } })), null);
    assert.equal(parseRichDoc(doc({ type: 'heading', attrs: { level: 1 }, content: [] })), null);
    assert.equal(parseRichDoc(doc(paragraph(text('x', [{ type: 'code' }])))), null);
    assert.equal(parseRichDoc({ type: 'doc', content: [] }), null);
    assert.equal(parseRichDoc('<p>html</p>'), null);
    assert.equal(parseRichDoc(undefined), null);
    assert.equal(parseRichDoc(null), null);
  });

  it('rejects documents nested too deeply or too large', () => {
    let nested: unknown = paragraph(text('deep'));
    for (let i = 0; i < 12; i++) nested = { type: 'blockquote', content: [nested] };
    assert.equal(parseRichDoc(doc(nested)), null);
    assert.equal(parseRichDoc(doc(paragraph(text('x'.repeat(100_001))))), null);
  });
});
