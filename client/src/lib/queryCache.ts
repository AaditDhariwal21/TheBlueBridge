/**
 * The app's one cache for data loaded from the API, with one freshness rule
 * (stale-while-revalidate):
 *
 * - Every view that shows data loads it when it mounts (entering a page refetches). If the
 *   cache already holds that data, it is shown at once and replaced in place when the fresh
 *   copy arrives: no blank flash, no scroll jump.
 * - When the browser tab becomes visible again, regains focus or comes back online, every
 *   key that is on screen is loaded again the same way.
 * - Local changes (a comment posted, a blog removed) update the cached copies at once. A
 *   load that was already running when such a change happened is discarded and run again,
 *   so it can never undo the change.
 *
 * Keys are strings such as "blogs/thread/blog:123". Read through useQuery / usePagedList.
 * The cache is cleared when the signed-in user changes (AuthProvider), so one account never
 * sees another's data.
 */

export type Loader<T> = (signal: AbortSignal) => Promise<T>;

/** What a hook needs to render one key. Replaced (never mutated) on every change. */
export interface Snapshot {
  data: unknown;
  hasData: boolean;
  /** What is running now: a (re)load of the whole value, or a follow-up such as a next page. */
  pending: 'load' | 'more' | null;
  /** The last operation failed (cleared by the next success). */
  failed: 'load' | 'more' | null;
}

interface Entry {
  snapshot: Snapshot;
  listeners: Set<() => void>;
  /** The most recent loader a mounted hook registered, for revalidation. */
  loader: Loader<unknown> | null;
  running: Promise<void> | null;
  controller: AbortController | null;
  /** Bumped by every local change; a load started before a change is discarded. */
  version: number;
  /** When the last listener left; idle entries are evicted beyond MAX_IDLE. */
  idleSince: number;
}

const EMPTY: Snapshot = { data: undefined, hasData: false, pending: null, failed: null };
/** Unmounted keys kept for instant back-navigation; the oldest beyond this are dropped. */
const MAX_IDLE = 150;
/** Focus and visibility events often arrive together; one revalidation covers both. */
const REVALIDATE_GAP_MS = 1_000;

const entries = new Map<string, Entry>();
const revalidateListeners = new Set<() => void>();

function entryOf(key: string): Entry {
  let entry = entries.get(key);
  if (!entry) {
    entry = {
      snapshot: EMPTY,
      listeners: new Set(),
      loader: null,
      running: null,
      controller: null,
      version: 0,
      idleSince: Date.now(),
    };
    entries.set(key, entry);
    evictIdle();
  }
  return entry;
}

function evictIdle(): void {
  const idle = [...entries].filter(([, e]) => e.listeners.size === 0 && e.running === null);
  if (idle.length <= MAX_IDLE) return;
  idle.sort(([, a], [, b]) => a.idleSince - b.idleSince);
  for (const [key] of idle.slice(0, idle.length - MAX_IDLE)) entries.delete(key);
}

function update(entry: Entry, change: Partial<Snapshot>): void {
  entry.snapshot = { ...entry.snapshot, ...change };
  for (const listener of entry.listeners) listener();
}

/* ------------------------------------------------------------------ hooks' side */

export function getSnapshot(key: string): Snapshot {
  return entries.get(key)?.snapshot ?? EMPTY;
}

export function subscribe(key: string, listener: () => void): () => void {
  const entry = entryOf(key);
  entry.listeners.add(listener);
  startWatching();
  return () => {
    entry.listeners.delete(listener);
    if (entry.listeners.size > 0) return;
    entry.idleSince = Date.now();
    abortRunning(entry); // nobody is waiting for it any more
  };
}

/** Cancels what is running for an entry and frees its slot at once. */
function abortRunning(entry: Entry): void {
  if (!entry.controller) return;
  entry.controller.abort();
  entry.controller = null;
  entry.running = null;
  update(entry, { pending: null });
}

/**
 * Loads `key` with `loader` (and remembers the loader for revalidation). If a load or
 * follow-up for the key is already running, waits for it instead of starting another.
 */
export function load<T>(key: string, loader: Loader<T>): Promise<void> {
  const entry = entryOf(key);
  entry.loader = loader;
  return (
    entry.running ?? run(key, entry, 'load', async (signal) => ({ data: await loader(signal) }))
  );
}

/**
 * A follow-up that extends the cached value (e.g. the next page). Waits for any running
 * load first; `task` gets the value as it is then.
 */
export async function extend<T>(
  key: string,
  task: (current: T, signal: AbortSignal) => Promise<T>,
): Promise<void> {
  const entry = entryOf(key);
  if (entry.running) await entry.running;
  if (!entry.snapshot.hasData || entry.running) return;
  await run(key, entry, 'more', async (signal) => ({
    data: await task(entry.snapshot.data as T, signal),
  }));
}

function run(
  key: string,
  entry: Entry,
  kind: 'load' | 'more',
  task: (signal: AbortSignal) => Promise<{ data: unknown }>,
): Promise<void> {
  const controller = new AbortController();
  const startedAt = entry.version;
  entry.controller = controller;
  update(entry, { pending: kind });

  const running: Promise<void> = task(controller.signal).then(
    ({ data }) => {
      if (controller.signal.aborted) return;
      settle();
      if (entry.version === startedAt) {
        update(entry, { data, hasData: true, pending: null, failed: null });
        return;
      }
      // Changed locally while loading: the answer may predate the change. Ask again.
      update(entry, { pending: null });
      if (entry.listeners.size > 0 && entry.loader) void load(key, entry.loader);
    },
    () => {
      if (controller.signal.aborted) return;
      settle();
      update(entry, { pending: null, failed: kind });
    },
  );
  function settle() {
    if (entry.running !== running) return;
    entry.running = null;
    entry.controller = null;
  }
  entry.running = running;
  return running;
}

/* ------------------------------------------------------------- local changes */

/** Sets a key's value, e.g. what an action returned. */
export function setQueryData(key: string, data: unknown): void {
  const entry = entryOf(key);
  entry.version++;
  update(entry, { data, hasData: true, failed: null });
}

/** Changes a cached value in place; nothing happens for a key that has no value yet. */
export function updateQueryData<T>(key: string, change: (current: T) => T): void {
  updateQueriesWhere<T>((k) => k === key, change);
}

/** Changes every cached value whose key matches, e.g. all Feed pages after a removal. */
export function updateQueriesWhere<T>(
  matches: (key: string) => boolean,
  change: (current: T) => T,
): void {
  for (const [key, entry] of entries) {
    if (!matches(key) || !entry.snapshot.hasData) continue;
    entry.version++;
    update(entry, { data: change(entry.snapshot.data as T) });
  }
}

/** Forgets everything, e.g. when the signed-in user changes, then reloads what is on screen. */
export function clearQueryCache(): void {
  for (const entry of entries.values()) {
    abortRunning(entry);
    entry.version++;
    update(entry, EMPTY);
  }
  for (const [key, entry] of entries) if (entry.listeners.size === 0) entries.delete(key);
  revalidateMounted();
}

/* --------------------------------------------------------------- revalidation */

let lastRevalidation = 0;

/** Loads every key that is on screen again. Also tells onRevalidate listeners. */
export function revalidateMounted(): void {
  lastRevalidation = Date.now();
  for (const [key, entry] of entries) {
    if (entry.listeners.size > 0 && entry.loader) void load(key, entry.loader);
  }
  for (const listener of revalidateListeners) listener();
}

/** Runs `listener` whenever on-screen data is revalidated (focus, visibility, online). */
export function onRevalidate(listener: () => void): () => void {
  revalidateListeners.add(listener);
  startWatching();
  return () => {
    revalidateListeners.delete(listener);
  };
}

let watching = false;

function startWatching(): void {
  if (watching || typeof window === 'undefined') return;
  watching = true;
  const revalidate = () => {
    if (document.visibilityState !== 'visible') return;
    if (Date.now() - lastRevalidation < REVALIDATE_GAP_MS) return;
    revalidateMounted();
  };
  document.addEventListener('visibilitychange', revalidate);
  window.addEventListener('focus', revalidate);
  window.addEventListener('online', revalidate);
}
