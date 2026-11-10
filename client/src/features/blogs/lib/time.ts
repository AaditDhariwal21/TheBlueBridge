const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const DAYS = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const SHORT_DATE = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });
const SHORT_DATE_YEAR = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const FULL = new Intl.DateTimeFormat('en-IN', { dateStyle: 'long', timeStyle: 'short' });

/**
 * Compact relative time, as on social feeds: "just now", "12 min ago",
 * "3 hr ago", "yesterday", "4 days ago", then a plain date after a week.
 */
export function formatRelative(iso: string, now: number): string {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, now - then);

  if (diff < MINUTE) return 'just now';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} min ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)} hr ago`;
  if (diff < 7 * DAY) return DAYS.format(-Math.floor(diff / DAY), 'day');

  const sameYear = new Date(then).getFullYear() === new Date(now).getFullYear();
  return (sameYear ? SHORT_DATE : SHORT_DATE_YEAR).format(then);
}

/** "5 November 2026 at 3:40 pm": used for tooltips and full dates. */
export function formatFull(iso: string): string {
  return FULL.format(new Date(iso));
}

export function formatDate(iso: string): string {
  return SHORT_DATE_YEAR.format(new Date(iso));
}
