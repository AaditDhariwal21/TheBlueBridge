import type { WaitlistInput } from './waitlist';

export type WaitlistResult = { ok: true } | { ok: false; reason: 'network' | 'rejected' };

/**
 * STUB: the single integration point for the waitlist.
 *
 * It sends nothing anywhere; it just simulates latency and succeeds. When a
 * backend exists, replace the body with the real request and map failures to
 * `{ ok: false, reason }`. The form already handles both outcomes. The server
 * must re-validate and rate-limit; never trust client validation alone.
 */
export async function submitWaitlist(input: WaitlistInput): Promise<WaitlistResult> {
  await new Promise((resolve) => setTimeout(resolve, 900));
  // Defensive: callers validate first, but never "accept" an empty entry.
  if (!input.name || !input.email) return { ok: false, reason: 'rejected' };
  return { ok: true };
}
