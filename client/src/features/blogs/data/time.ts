/**
 * Seed timestamps are relative to when the app loads, so the mock feed always
 * looks recent ("2 hr ago", "3 weeks ago") instead of ageing with the code.
 */
const LOADED_AT = Date.now();

const MINUTE = 60_000;

export interface Ago {
  days?: number;
  hours?: number;
  minutes?: number;
}

export function ago({ days = 0, hours = 0, minutes = 0 }: Ago): string {
  const ms = ((days * 24 + hours) * 60 + minutes) * MINUTE;
  return new Date(LOADED_AT - ms).toISOString();
}

/** A moment `minutes` after `iso`, never in the future. */
export function after(iso: string, minutes: number): string {
  const t = Math.min(new Date(iso).getTime() + minutes * MINUTE, LOADED_AT - MINUTE);
  return new Date(t).toISOString();
}
