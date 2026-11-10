import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';

import { Button } from '../../../../components/ui/Button';
import { scrollIntoViewGently } from '../../../../lib/motion';
import { MEDIA, useMediaQuery } from '../../../../lib/useMediaQuery';
import { buildCommentTree } from '../../lib/commentTree';
import { THREAD_PARAM } from '../../lib/paths';
import { plural } from '../../lib/text';
import type { CommentSubject } from '../../model/types';
import { useThread } from '../../state/hooks';
import { ArrowLeftIcon } from '../shared/Icons';
import { Skeleton } from '../shared/Skeleton';
import { StateMessage } from '../shared/StateMessage';
import { CommentComposer } from './CommentComposer';
import { CommentItem } from './CommentItem';
import { commentDomId, ThreadUiContext, type ThreadCopy, type ThreadUi } from './threadContext';

interface CommentsSectionProps {
  subject: CommentSubject;
  copy: ThreadCopy;
  /** The blog's author, tagged "Author" in the thread. Null on Query Blogs. */
  authorId: string | null;
}

const toggled = (set: ReadonlySet<string>, id: string, on: boolean): ReadonlySet<string> => {
  if (set.has(id) === on) return set;
  const next = new Set(set);
  if (on) next.add(id);
  else next.delete(id);
  return next;
};

const EMPTY: ReadonlySet<string> = new Set();
const ZERO_WIDTH_SPACE = String.fromCharCode(0x200b);

/**
 * A full conversation: heading, composer and the threaded list. Also renders
 * the focused "continue thread" view when `?thread=<commentId>` is present,
 * which re-roots the conversation at that comment with fresh indentation.
 */
export function CommentsSection({ subject, copy, authorId }: CommentsSectionProps) {
  const { comments, status, retry, post } = useThread(subject);
  const tree = useMemo(() => buildCommentTree(comments), [comments]);
  const maxDepth = useMediaQuery(MEDIA.sm) ? 3 : 2;

  const [collapsed, setCollapsed] = useState(EMPTY);
  const [expanded, setExpanded] = useState(EMPTY);
  const [fresh, setFresh] = useState(EMPTY);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [focusTarget, setFocusTarget] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const [params] = useSearchParams();
  const focusId = params.get(THREAD_PARAM);
  const focusNode = focusId ? tree.byId.get(focusId) : undefined;

  const sectionRef = useRef<HTMLElement>(null);
  const bannerRef = useRef<HTMLParagraphElement>(null);
  const previousFocusId = useRef(focusId);

  const markPosted = useCallback((id: string, message: string) => {
    setFresh((prev) => toggled(prev, id, true));
    setFocusTarget(id);
    // An invisible trailing character makes a repeated message re-announce.
    setAnnouncement((prev) => (prev === message ? message + ZERO_WIDTH_SPACE : message));
  }, []);

  const postReply = useCallback(
    async (parentId: string, body: string) => {
      const reply = await post(parentId, body);
      setCollapsed((prev) => toggled(prev, parentId, false));
      setReplyingTo(null);
      markPosted(reply.id, 'Your reply has been posted.');
    },
    [post, markPosted],
  );

  const postTopLevel = async (body: string) => {
    const entry = await post(null, body);
    markPosted(entry.id, copy.postedMessage);
  };

  // Move focus to what was just posted, so it is announced and in view.
  useEffect(() => {
    if (!focusTarget) return;
    const el = document.getElementById(commentDomId(focusTarget));
    if (!el) return;
    el.focus({ preventScroll: true });
    scrollIntoViewGently(el, 'nearest');
  }, [focusTarget]);

  // Entering a focused thread: go to its top. Leaving: return to where we were.
  useEffect(() => {
    const previous = previousFocusId.current;
    previousFocusId.current = focusId;
    if (previous === focusId) return;
    if (focusId) {
      bannerRef.current?.focus({ preventScroll: true });
      if (sectionRef.current) scrollIntoViewGently(sectionRef.current, 'start');
    } else if (previous) {
      const el = document.getElementById(commentDomId(previous));
      if (!el) return;
      el.focus({ preventScroll: true });
      scrollIntoViewGently(el, 'center');
    }
  }, [focusId]);

  const ui = useMemo<ThreadUi>(
    () => ({
      copy,
      maxDepth,
      authorId,
      byId: tree.byId,
      collapsed,
      toggleCollapsed: (id) => {
        setCollapsed((prev) => toggled(prev, id, !prev.has(id)));
      },
      expanded,
      expand: (id) => {
        setExpanded((prev) => toggled(prev, id, true));
      },
      fresh,
      replyingTo,
      openReply: setReplyingTo,
      closeReply: () => {
        setReplyingTo(null);
      },
      postReply,
      continueTo: (id) => ({ search: `?${THREAD_PARAM}=${encodeURIComponent(id)}` }),
    }),
    [copy, maxDepth, authorId, tree.byId, collapsed, expanded, fresh, replyingTo, postReply],
  );

  const [one, many] = copy.entryNoun;
  const total =
    subject.kind === 'blog'
      ? plural(comments.length, one, many)
      : plural(tree.roots.length, one, many);
  const loading = status === 'loading' || status === 'idle';

  let body;
  if (status === 'error') {
    body = (
      <StateMessage
        role="alert"
        headingLevel="h3"
        title="Couldn’t load the conversation"
        action={
          <Button variant="outline" onClick={retry}>
            Try again
          </Button>
        }
      >
        Check your connection and try again.
      </StateMessage>
    );
  } else if (loading && comments.length === 0) {
    body = <ThreadSkeleton />;
  } else if (focusId) {
    body = focusNode ? (
      <div>
        <div className="flex flex-wrap items-center justify-between gap-x-4 border border-border bg-surface px-4 py-1">
          <p ref={bannerRef} tabIndex={-1} className="py-2 text-sm text-text-muted">
            Viewing one thread from this conversation
          </p>
          <Link
            to={{ search: '' }}
            className="-mr-2 inline-flex min-h-11 items-center gap-1.5 px-2 text-sm font-medium text-accent hover:underline"
          >
            <ArrowLeftIcon />
            All {many}
          </Link>
        </div>
        <ul className="mt-6">
          <li>
            <CommentItem node={focusNode} depth={0} />
          </li>
        </ul>
      </div>
    ) : (
      <StateMessage
        headingLevel="h3"
        title="This thread isn’t available"
        action={
          <Link to={{ search: '' }} className="text-sm font-medium text-accent hover:underline">
            See all {many}
          </Link>
        }
      >
        It may have been removed, or the link is incomplete.
      </StateMessage>
    );
  } else if (tree.roots.length === 0) {
    body = (
      <StateMessage headingLevel="h3" title={copy.emptyTitle}>
        {copy.emptyBody}
      </StateMessage>
    );
  } else {
    body = (
      <>
        <p className="mb-1 text-xs text-text-muted">Newest first</p>
        <ul className="divide-y divide-border border-t border-border">
          {tree.roots.map((root) => (
            <li key={root.comment.id} className="py-6 sm:py-7">
              <CommentItem node={root} depth={0} />
            </li>
          ))}
        </ul>
      </>
    );
  }

  return (
    <ThreadUiContext value={ui}>
      <section
        ref={sectionRef}
        id="conversation"
        aria-labelledby="conversation-title"
        aria-busy={loading}
        className="scroll-mt-24"
      >
        <h2 id="conversation-title" className="flex items-baseline gap-3 text-h3 sm:text-lead">
          {copy.heading}
          {!loading && <span className="font-sans text-sm text-text-muted">{total}</span>}
        </h2>

        {!focusId && (
          <div className="mt-5 mb-8">
            <CommentComposer
              label={copy.composerLabel}
              placeholder={copy.composerPlaceholder}
              submitLabel={copy.composerSubmit}
              onSubmit={postTopLevel}
            />
          </div>
        )}
        {focusId && <div className="mt-5" />}

        {body}

        <p role="status" className="sr-only">
          {announcement}
        </p>
      </section>
    </ThreadUiContext>
  );
}

function ThreadSkeleton() {
  return (
    <div className="flex flex-col gap-8 border-t border-border pt-6">
      <span className="sr-only">Loading the conversation…</span>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-3">
          <span className="size-9 shrink-0 animate-shimmer rounded-full bg-border/70" />
          <div className="flex-1">
            <Skeleton className="h-3 w-40 max-w-full" />
            <Skeleton className="mt-2 h-2.5 w-24" />
            <Skeleton className="mt-4 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
