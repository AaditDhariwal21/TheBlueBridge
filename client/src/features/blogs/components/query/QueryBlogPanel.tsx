import { PinIcon } from '../shared/Icons';
import { QueryBlogList } from './QueryBlogList';

/** Desktop side panel: heading, one-line explainer and the pinned Query Blogs. */
export function QueryBlogPanel({ activeId }: { activeId?: string | undefined }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs tracking-caps text-text-muted uppercase">
        <PinIcon className="size-3.5 text-accent-2" />
        Pinned
      </div>
      <h2 id="query-panel-title" className="mt-2 text-h3">
        Query Blogs
      </h2>
      <p className="mt-1 mb-5 text-sm text-text-muted">
        One per category. Any member asks; ambassadors answer.
      </p>
      <QueryBlogList activeId={activeId} />
    </div>
  );
}
