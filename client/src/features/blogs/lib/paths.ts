/** URL builders for the Blogs section. The route patterns live in app/routes.ts. */

export const BLOGS_PATH = '/blogs';

export type BlogsTab = 'feed' | 'queries';

export const blogPath = (id: string) => `${BLOGS_PATH}/${encodeURIComponent(id)}`;

export const queryBlogPath = (id: string) => `${BLOGS_PATH}/query/${encodeURIComponent(id)}`;

/** The feed page with a given mobile tab selected. */
export const blogsTabPath = (tab: BlogsTab) =>
  tab === 'feed' ? BLOGS_PATH : `${BLOGS_PATH}?tab=${tab}`;

/** Query param for the focused "continue thread" view on a blog or topic page. */
export const THREAD_PARAM = 'thread';
