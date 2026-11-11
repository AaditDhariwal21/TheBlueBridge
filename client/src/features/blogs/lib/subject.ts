import type { CommentSubject } from '../model/types';

/** Stable string key for a comment subject, used to index threads. */
export type SubjectKey = `blog:${string}` | `query:${string}`;

export function subjectKey(subject: CommentSubject): SubjectKey {
  return subject.kind === 'blog' ? `blog:${subject.blogId}` : `query:${subject.queryBlogId}`;
}

export function subjectFromKey(key: SubjectKey): CommentSubject {
  return key.startsWith('blog:')
    ? { kind: 'blog', blogId: key.slice('blog:'.length) }
    : { kind: 'query', queryBlogId: key.slice('query:'.length) };
}
