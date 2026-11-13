/**
 * Search-as-you-type input → a `to_tsquery('simple', …)` string: every word must match, the
 * last one as a prefix, so "wom" finds "women" while it is still being typed.
 *
 * Only words made of letters, combining marks and digits survive (any script), so tsquery
 * syntax in the input (& | ! <-> : * ( ) and quotes) never reaches Postgres as an operator.
 * The result is still sent as a bound parameter, never spliced into SQL. Null when nothing
 * searchable is left (e.g. "!!" or "--").
 */

const WORD = /[\p{L}\p{N}][\p{L}\p{M}\p{N}]*/gu;
/** More words only narrow the result; this bounds the query's size. */
const MAX_WORDS = 8;

export function toPrefixTsQuery(input: string): string | null {
  const words = (input.toLowerCase().match(WORD) ?? []).slice(0, MAX_WORDS);
  if (words.length === 0) return null;
  return words.map((word, i) => (i === words.length - 1 ? `${word}:*` : word)).join(' & ');
}
