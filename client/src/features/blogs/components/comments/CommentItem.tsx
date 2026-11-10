import { useRef } from 'react';
import { Link } from 'react-router';

import { cn } from '../../../../lib/cn';
import { flattenReplies, type CommentNode } from '../../lib/commentTree';
import { plural } from '../../lib/text';
import { Avatar } from '../shared/Avatar';
import { ArrowRightIcon, ChevronDownIcon, ElbowIcon, ReplyIcon } from '../shared/Icons';
import { RelativeTime } from '../shared/RelativeTime';
import { CommentComposer } from './CommentComposer';
import { commentDomId, REPLIES_SHOWN, useThreadUi } from './threadContext';

/*
 * Geometry. Top-level comments use a 36px avatar column and a 12px gap;
 * replies use 28px and 10px. A parent's thread line runs down the centre of
 * its avatar column (x = 18px or 14px), which is 30px or 24px to the left of
 * where its replies start. Each reply draws a small square elbow from that
 * line into its own avatar, so it is always clear which comment a reply
 * hangs from. The class names below encode exactly those offsets.
 */
const LAYOUT = {
  top: { gap: 'gap-3', column: 'w-9', lineTop: 'top-10', hit: '-inset-x-1' },
  reply: { gap: 'gap-2.5', column: 'w-7', lineTop: 'top-8', hit: '-inset-x-2' },
} as const;

/** Elbow from the parent's line into this reply's avatar (avatar centre: 14px). */
const ELBOW = {
  fromTop: '-left-7.5 w-6.5',
  fromReply: '-left-6 w-5',
} as const;

interface CommentItemProps {
  node: CommentNode;
  depth: number;
  /** Beyond the indentation cap: drawn at the last level, without nesting or elbow. */
  flat?: boolean;
}

export function CommentItem({ node, depth, flat = false }: CommentItemProps) {
  const ui = useThreadUi();
  const replyButtonRef = useRef<HTMLButtonElement>(null);
  const { comment } = node;
  const domId = commentDomId(comment.id);

  const size = depth === 0 ? LAYOUT.top : LAYOUT.reply;
  const parent = comment.parentId ? ui.byId.get(comment.parentId) : undefined;
  // At the cap, replies are listed flat after this comment by the parent list.
  const nests = !flat && depth < ui.maxDepth && node.children.length > 0;
  const collapsed = nests && ui.collapsed.has(comment.id);
  const isReplying = ui.replyingTo === comment.id;
  const isAuthor = ui.authorId !== null && ui.authorId === comment.author.id;
  const repliesId = `${domId}-replies`;
  const replyCount = plural(node.descendantCount, 'reply', 'replies');

  const cancelReply = () => {
    ui.closeReply();
    replyButtonRef.current?.focus();
  };

  return (
    <article
      id={domId}
      tabIndex={-1}
      aria-labelledby={`${domId}-author`}
      className={cn(
        'relative scroll-mt-24',
        ui.fresh.has(comment.id) && 'motion-safe:animate-arrive',
      )}
    >
      {depth > 0 && !flat && (
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute top-0 h-3.5 border-b border-l border-border',
            depth === 1 ? ELBOW.fromTop : ELBOW.fromReply,
          )}
        />
      )}

      <div className={cn('flex', size.gap)}>
        <div className={cn('relative shrink-0', size.column)}>
          <Avatar user={comment.author} size={depth === 0 ? 'md' : 'sm'} />
          {nests && !collapsed && (
            <button
              type="button"
              onClick={() => {
                ui.toggleCollapsed(comment.id);
              }}
              aria-expanded="true"
              aria-controls={repliesId}
              aria-label={`Collapse ${replyCount} to ${comment.author.name}`}
              title="Collapse thread"
              className={cn('group/line absolute bottom-0 cursor-pointer', size.lineTop, size.hit)}
            >
              <span
                aria-hidden="true"
                className="absolute inset-y-0 left-5.5 w-px bg-border transition-colors group-hover/line:bg-accent group-focus-visible/line:bg-accent"
              />
            </button>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <header>
            <p className="flex flex-wrap items-baseline gap-x-1.5 text-sm">
              <span id={`${domId}-author`} className="font-medium wrap-anywhere text-text">
                {comment.author.name}
              </span>
              {isAuthor && <AuthorTag />}
              <span aria-hidden="true" className="text-text-muted">
                ·
              </span>
              <RelativeTime iso={comment.createdAt} className="text-xs text-text-muted" />
            </p>
            <p className="truncate text-xs text-text-muted">{comment.author.profession}</p>
            {parent && (
              <p className="mt-1 flex min-w-0 items-center gap-1 text-xs text-text-muted">
                <ElbowIcon className="size-3.5 text-accent-soft" />
                <span className="truncate">
                  Replying to{' '}
                  {depth > 0 ? (
                    <a
                      href={`#${commentDomId(parent.comment.id)}`}
                      className="text-accent underline-offset-2 hover:underline"
                    >
                      {parent.comment.author.name}
                    </a>
                  ) : (
                    // Root of a focused thread: the parent isn't on screen to jump to.
                    <span className="text-text">{parent.comment.author.name}</span>
                  )}
                </span>
              </p>
            )}
          </header>

          <p className="mt-2 text-base wrap-break-word whitespace-pre-line text-text">
            {comment.body}
          </p>

          <div className="mt-0.5 -ml-2 flex flex-wrap items-center gap-x-1">
            <button
              ref={replyButtonRef}
              type="button"
              onClick={() => {
                if (isReplying) cancelReply();
                else ui.openReply(comment.id);
              }}
              aria-expanded={isReplying}
              className={cn(
                'inline-flex min-h-11 items-center gap-1.5 px-2 text-sm text-text-muted transition-colors hover:text-text',
                isReplying && 'text-text',
              )}
            >
              <ReplyIcon />
              Reply
              <span className="sr-only"> to {comment.author.name}</span>
            </button>
            {collapsed && (
              <button
                type="button"
                onClick={() => {
                  ui.toggleCollapsed(comment.id);
                }}
                aria-expanded="false"
                aria-controls={repliesId}
                className="inline-flex min-h-11 items-center"
              >
                <span className="inline-flex items-center gap-1 border border-border bg-surface px-2.5 py-1 text-xs font-medium text-text transition-colors hover:border-border-strong">
                  <ChevronDownIcon className="size-3.5" />
                  {replyCount}
                </span>
              </button>
            )}
          </div>

          {isReplying && (
            <CommentComposer
              variant="inline"
              focusOnMount
              label={`Reply to ${comment.author.name}`}
              placeholder={`Reply to ${comment.author.name}…`}
              submitLabel="Reply"
              onSubmit={(body) => ui.postReply(comment.id, body)}
              onCancel={cancelReply}
            />
          )}

          {nests && <ReplyList parent={node} depth={depth + 1} id={repliesId} hidden={collapsed} />}
        </div>
      </div>
    </article>
  );
}

function AuthorTag() {
  return (
    <span className="border border-accent/40 px-1.5 text-xs leading-5 font-medium text-accent">
      Author
    </span>
  );
}

interface ReplyListProps {
  parent: CommentNode;
  /** Depth of the replies in this list. */
  depth: number;
  id: string;
  hidden: boolean;
}

/**
 * A comment's replies. Shows the first few (plus anything posted this
 * session), with "View N more replies" for the rest. At the indentation cap
 * each reply is followed by its own sub-replies, flattened to the same level.
 */
function ReplyList({ parent, depth, id, hidden }: ReplyListProps) {
  const ui = useThreadUi();
  const atCap = depth >= ui.maxDepth;
  const showAll = ui.expanded.has(parent.comment.id);
  const visible = parent.children.filter(
    (child, i) => showAll || i < REPLIES_SHOWN || ui.fresh.has(child.comment.id),
  );
  const hiddenCount = parent.children.length - visible.length;

  return (
    <div id={id} hidden={hidden}>
      <ul
        aria-label={`Replies to ${parent.comment.author.name}`}
        className="mt-3 flex flex-col gap-5"
      >
        {visible.map((child) =>
          atCap ? (
            <CappedReply key={child.comment.id} node={child} depth={depth} />
          ) : (
            <li key={child.comment.id}>
              <CommentItem node={child} depth={depth} />
            </li>
          ),
        )}
      </ul>
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => {
            ui.expand(parent.comment.id);
          }}
          className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-accent hover:underline"
        >
          <ChevronDownIcon />
          View {plural(hiddenCount, 'more reply', 'more replies')}
        </button>
      )}
    </div>
  );
}

/**
 * A reply at the deepest indentation level, followed by everything beneath it
 * at that same level (each still labelled "Replying to …"). "Continue this
 * thread" opens the sub-conversation on its own, with full indentation again.
 */
function CappedReply({ node, depth }: { node: CommentNode; depth: number }) {
  const ui = useThreadUi();
  const tail = flattenReplies(node);
  const visibleTail = tail.filter((n, i) => i < REPLIES_SHOWN || ui.fresh.has(n.comment.id));
  const hiddenCount = tail.length - visibleTail.length;

  return (
    <li>
      <CommentItem node={node} depth={depth} />
      {visibleTail.length > 0 && (
        <ul
          aria-label={`Further replies under ${node.comment.author.name}`}
          className="mt-5 flex flex-col gap-5"
        >
          {visibleTail.map((n) => (
            <li key={n.comment.id}>
              <CommentItem node={n} depth={depth} flat />
            </li>
          ))}
        </ul>
      )}
      {tail.length > 0 && (
        <Link
          to={ui.continueTo(node.comment.id)}
          className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-accent hover:underline"
        >
          Continue this thread
          {hiddenCount > 0 && (
            <span className="font-normal text-text-muted">
              · {plural(hiddenCount, 'more reply', 'more replies')}
            </span>
          )}
          <ArrowRightIcon />
        </Link>
      )}
    </li>
  );
}
