import { useCallback, useMemo, useReducer, useRef, type ReactNode } from 'react';

import { BlogsContext, blogsReducer, initialBlogsState, type BlogsStore } from './store';

/**
 * Holds the Blogs cache for the whole session. Mounted above the router's
 * routes so it survives navigation between the feed, blog and topic pages.
 * It imports no data or API code, so it adds almost nothing to the main bundle.
 */
export function BlogsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(blogsReducer, initialBlogsState);
  const inflight = useRef(new Set<string>());

  const once = useCallback((key: string, task: () => Promise<void>) => {
    const running = inflight.current;
    if (running.has(key)) return;
    running.add(key);
    void task().finally(() => {
      running.delete(key);
    });
  }, []);

  const value = useMemo<BlogsStore>(() => ({ state, dispatch, once }), [state, once]);

  return <BlogsContext value={value}>{children}</BlogsContext>;
}
