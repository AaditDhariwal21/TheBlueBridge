import { PinIcon } from '../shared/Icons';
import { QueryBlogList } from './QueryBlogList';

/** Desktop side panel: "Ask the ambassadors", a one-line explainer and the pinned Query Blogs. */
export function QueryBlogPanel({ activeId }: { activeId?: string | undefined }) {
  return (
    <div>
      <p className="flex items-center gap-2 text-xs tracking-caps text-text-muted uppercase">
        <PinIcon className="size-3.5 text-accent-2" />
        Pinned · Query Blogs
      </p>
      <h2 id="query-panel-title" className="mt-2 text-h3">
        Ask the ambassadors
      </h2>
      <p className="mt-1 mb-5 text-sm text-text-muted">
        One Query Blog per category. Any member can ask; its ambassadors answer.
      </p>
      <QueryBlogList activeId={activeId} />
    </div>
  );
}
