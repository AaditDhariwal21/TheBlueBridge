import type { Comment } from '../model/types';

export interface CommentNode {
  comment: Comment;
  /** Direct replies, oldest first so conversations read top to bottom. */
  children: CommentNode[];
  /** All replies beneath this comment, at any depth. */
  descendantCount: number;
}

export interface CommentTree {
  /** Top-level comments, newest first (the composer sits above them). */
  roots: CommentNode[];
  byId: ReadonlyMap<string, CommentNode>;
}

const byTimeAsc = (a: CommentNode, b: CommentNode) =>
  a.comment.createdAt.localeCompare(b.comment.createdAt);

/**
 * Rebuilds the reply tree from a flat list. Replies whose parent is missing
 * are promoted to top level rather than dropped. A removed comment is kept
 * (as a placeholder) only while it still has replies to hold together.
 */
export function buildCommentTree(comments: readonly Comment[]): CommentTree {
  const byId = new Map<string, CommentNode>();
  for (const comment of comments) {
    byId.set(comment.id, { comment, children: [], descendantCount: 0 });
  }

  const roots: CommentNode[] = [];
  for (const node of byId.values()) {
    const parent = node.comment.parentId ? byId.get(node.comment.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const finalise = (node: CommentNode): number => {
    node.children.sort(byTimeAsc);
    node.descendantCount = node.children.reduce((sum, child) => sum + 1 + finalise(child), 0);
    return node.descendantCount;
  };
  const prune = (nodes: CommentNode[]): CommentNode[] =>
    nodes.filter((node) => {
      node.children = prune(node.children);
      const keep = !node.comment.removed || node.children.length > 0;
      if (!keep) byId.delete(node.comment.id);
      return keep;
    });
  const visible = prune(roots);
  visible.forEach(finalise);
  visible.sort((a, b) => byTimeAsc(b, a));

  return { roots: visible, byId };
}

/** Every reply beneath `node` in reading order (depth-first, oldest first). */
export function flattenReplies(node: CommentNode): CommentNode[] {
  const out: CommentNode[] = [];
  const walk = (n: CommentNode) => {
    for (const child of n.children) {
      out.push(child);
      walk(child);
    }
  };
  walk(node);
  return out;
}
