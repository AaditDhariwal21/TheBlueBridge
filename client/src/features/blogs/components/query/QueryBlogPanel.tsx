import { PANEL, PANEL_TITLE } from '../shared/surface';
import { QueryBlogList } from './QueryBlogList';

/**
 * "Query Blogs": the pinned Query Blogs, in the right column or the phone tab. How they work is
 * explained in `HowBlogsWork`, so the panel is just its heading and the list.
 */
export function QueryBlogPanel({ activeId }: { activeId?: string | undefined }) {
  return (
    <section aria-labelledby="query-panel-title" className={PANEL}>
      <div className="p-6 pb-4">
        <h2 id="query-panel-title" className={PANEL_TITLE}>
          Query Blogs
        </h2>
      </div>
      <QueryBlogList activeId={activeId} />
    </section>
  );
}
