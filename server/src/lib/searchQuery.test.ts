import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { toPrefixTsQuery } from './searchQuery.ts';

describe('toPrefixTsQuery', () => {
  it('requires every word and matches the last one as a prefix', () => {
    assert.equal(toPrefixTsQuery('Women in Fin'), 'women & in & fin:*');
    assert.equal(toPrefixTsQuery('  tax  '), 'tax:*');
  });

  it('drops tsquery operators, quotes and punctuation', () => {
    assert.equal(toPrefixTsQuery("it's a <-> b | !c & (d):* 'e'"), 'it & s & a & b & c & d & e:*');
    assert.equal(toPrefixTsQuery('co-founder\\'), 'co & founder:*');
  });

  it('keeps words in any script, with their combining marks', () => {
    assert.equal(toPrefixTsQuery('महिला उद्यमी'), 'महिला & उद्यमी:*');
    assert.equal(toPrefixTsQuery('Café 2026'), 'café & 2026:*');
  });

  it('is null when nothing searchable is left', () => {
    for (const input of ['', '   ', '!!', '-- ::', '😀', '́́']) {
      assert.equal(toPrefixTsQuery(input), null, JSON.stringify(input));
    }
  });

  it('caps the number of words', () => {
    assert.equal(toPrefixTsQuery('a b c d e f g h i j'), 'a & b & c & d & e & f & g & h:*');
  });
});
