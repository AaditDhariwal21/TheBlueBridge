import { useSyncExternalStore } from 'react';

/**
 * A shared clock for relative timestamps ("5 min ago"). One interval serves
 * every subscriber and only runs while something is listening.
 */
const TICK_MS = 30_000;

let now = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((l) => {
        l();
      });
    }, TICK_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

const getSnapshot = () => now;

/** Current time in ms, refreshed every 30 seconds. */
export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot);
}
