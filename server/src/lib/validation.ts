import { z } from 'zod';

import { validationError, type FieldErrors } from './errors.ts';
import { normalizeMultiline, normalizeSingleLine } from './text.ts';

/** Parses untrusted input or throws VALIDATION_FAILED with one message per field. */
export function parseInput<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  const fields: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.map(String).join('.') || '_';
    fields[key] ??= issue.message;
  }
  throw validationError(fields);
}

/** A normalized single-line string of `min`–`max` characters. */
export function singleLineText(min: number, max: number, required: string) {
  return lengthChecked(normalizeSingleLine, min, max, required);
}

/** Normalized multi-line text (paragraphs kept) of `min`–`max` characters. */
export function multilineText(min: number, max: number, required: string) {
  return lengthChecked(normalizeMultiline, min, max, required);
}

function lengthChecked(
  normalize: (value: string) => string,
  min: number,
  max: number,
  required: string,
) {
  return z
    .string({ error: required })
    .transform(normalize)
    .pipe(
      z
        .string()
        .min(1, { error: required })
        .min(min, { error: `Use at least ${min} characters.` })
        .max(max, { error: `Keep this under ${max.toLocaleString('en-IN')} characters.` }),
    );
}
