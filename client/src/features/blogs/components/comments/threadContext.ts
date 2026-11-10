import { createContext, useContext } from 'react';
import type { To } from 'react-router';

import type { CommentNode } from '../../lib/commentTree';

/** Wording that differs between a blog's comments and a topic's queries. */
export interface ThreadCopy {
  heading: string;
  /** Singular and plural for top-level entries: comment(s) / query(ies). */
  entryNoun: readonly [string, string];
  composerLabel: string;
  composerPlaceholder: string;
  composerSubmit: string;
  postedMessage: string;
  emptyTitle: string;
  emptyBody: string;
}

/** Everything a comment in the tree needs from the thread around it. */
export interface ThreadUi {
  copy: ThreadCopy;
  /** Deepest visual indentation level (3 on wider screens, 2 on phones). */
  maxDepth: number;
  /** Comments by this user get the "Author" tag. Null for Query Blogs. */
  authorId: string | null;
  byId: ReadonlyMap<string, CommentNode>;

  collapsed: ReadonlySet<string>;
  toggleCollapsed: (commentId: string) => void;
  /** Reply lists (keyed by parent id) showing every reply, not just the first few. */
  expanded: ReadonlySet<string>;
  expand: (commentId: string) => void;

  /** Posted this session: always visible, and animated in once. */
  fresh: ReadonlySet<string>;
  replyingTo: string | null;
  openReply: (commentId: string) => void;
  closeReply: () => void;
  postReply: (parentId: string, body: string) => Promise<void>;

  /** Link to the focused "continue thread" view rooted at a comment. */
  continueTo: (commentId: string) => To;
}

export const ThreadUiContext = createContext<ThreadUi | null>(null);

export function useThreadUi(): ThreadUi {
  const ui = useContext(ThreadUiContext);
  if (!ui) throw new Error('Comment components must be rendered inside a CommentsSection.');
  return ui;
}

/** How many replies each list shows before "View N more replies". */
export const REPLIES_SHOWN = 2;

export const commentDomId = (commentId: string) => `comment-${commentId}`;

export const BLOG_COMMENTS_COPY: ThreadCopy = {
  heading: 'Comments',
  entryNoun: ['comment', 'comments'],
  composerLabel: 'Add a comment',
  composerPlaceholder: 'Share your thoughts or experience…',
  composerSubmit: 'Comment',
  postedMessage: 'Your comment has been posted.',
  emptyTitle: 'No comments yet',
  emptyBody: 'Start the conversation. Your perspective could be exactly what someone needs.',
};

export const QUERY_COPY: ThreadCopy = {
  heading: 'Queries',
  entryNoun: ['query', 'queries'],
  composerLabel: 'Ask a query',
  composerPlaceholder: 'What would you like to ask the community?',
  composerSubmit: 'Post query',
  postedMessage: 'Your query has been posted.',
  emptyTitle: 'No queries yet',
  emptyBody: 'Ask the first question. Someone here has probably been through it.',
};
