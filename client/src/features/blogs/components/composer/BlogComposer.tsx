import { lazy, Suspense, useEffect, useId, useRef, useState, type SubmitEvent } from 'react';

import { Button } from '../../../../components/ui/Button';
import { Field } from '../../../../components/ui/Field';
import { Input } from '../../../../components/ui/Input';
import { Skeleton } from '../../../../components/ui/Skeleton';
import { ApiError } from '../../../../lib/api';
import { cn } from '../../../../lib/cn';
import { useCategories } from '../../../categories/useCategories';
import { countWords, estimateReadTime, plural } from '../../lib/text';
import type { RichDoc } from '../../model/richText';
import type { Blog } from '../../model/types';
import {
  BLOG_RULES,
  validateBlogDraft,
  type BlogDraft,
  type BlogDraftErrors,
} from '../../model/validation';
import { useCreateBlog } from '../../state/hooks';
import { useViewerAuthor } from '../../state/viewer';
import { Avatar } from '../../../../components/ui/Avatar';
import { CategoryChoice } from '../shared/CategoryChoice';
import { CharacterCount } from '../shared/CharacterCount';
import { CloseIcon } from '../shared/Icons';
import type { RichTextEditorHandle } from './RichTextEditor';

/** The editor's code (TipTap) only downloads when someone opens the composer. */
const RichTextEditor = lazy(() =>
  import('./RichTextEditor').then((module) => ({ default: module.RichTextEditor })),
);

const EMPTY_DRAFT: BlogDraft = { title: '', content: null, text: '', categoryIds: [] };
const DRAFT_FIELDS = new Set<string>(['title', 'content', 'categoryIds']);
const SAVE_DELAY_MS = 600;

/* Drafts are kept in this browser, per member, so a reload or closed tab loses nothing. */
const draftKey = (userId: string) => `tbb.blogDraft.${userId}`;

function loadDraft(userId: string): BlogDraft | null {
  try {
    const raw = localStorage.getItem(draftKey(userId));
    if (!raw) return null;
    const saved = JSON.parse(raw) as Partial<BlogDraft>;
    return {
      title: typeof saved.title === 'string' ? saved.title : '',
      content: saved.content ?? null,
      text: typeof saved.text === 'string' ? saved.text : '',
      categoryIds: Array.isArray(saved.categoryIds) ? saved.categoryIds : [],
    };
  } catch {
    return null;
  }
}

function saveDraft(userId: string, draft: BlogDraft): void {
  try {
    const empty = !draft.title.trim() && !draft.text.trim() && draft.categoryIds.length === 0;
    if (empty) localStorage.removeItem(draftKey(userId));
    else localStorage.setItem(draftKey(userId), JSON.stringify(draft));
  } catch {
    // Storage can be unavailable (private mode, quota); the draft still lives in memory.
  }
}

interface BlogComposerProps {
  open: boolean;
  onClose: () => void;
  onPublished: (blog: Blog) => void;
}

/**
 * "Write a blog". A native modal <dialog>: full-screen sheet on phones, a wide
 * centred panel from `sm` up. The rest of the page is inert while it is open,
 * Escape closes it, and focus returns to the button that opened it.
 *
 * The body is a formatting editor (bold, italic, underline, headings, lists,
 * quotes, links). The draft is saved in this browser as you type and cleared
 * only when the blog is published. Ctrl/⌘ + Enter publishes.
 */
export function BlogComposer({ open, onClose, onPublished }: BlogComposerProps) {
  const viewer = useViewerAuthor();
  const viewerId = viewer?.id ?? null;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<RichTextEditorHandle>(null);
  const firstCategoryRef = useRef<HTMLInputElement>(null);
  const headingId = useId();
  const bodyLabelId = useId();
  const bodyHintId = useId();
  const bodyErrorId = useId();

  const [draft, setDraft] = useState<BlogDraft>(EMPTY_DRAFT);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [errors, setErrors] = useState<BlogDraftErrors>({});
  const [attempted, setAttempted] = useState(false);
  const [status, setStatus] = useState<'idle' | 'publishing' | 'error'>('idle');
  const [failure, setFailure] = useState<string | null>(null);
  const categories = useCategories();
  const createBlog = useCreateBlog();

  const publishing = status === 'publishing';

  // Restore this member's saved draft once (during render: no flash of an empty form).
  if (viewerId !== null && loadedFor !== viewerId) {
    setLoadedFor(viewerId);
    setDraft(loadDraft(viewerId) ?? EMPTY_DRAFT);
  }

  // Save shortly after typing stops.
  useEffect(() => {
    if (viewerId === null || loadedFor !== viewerId) return;
    const timer = window.setTimeout(() => {
      saveDraft(viewerId, draft);
      setSavedAt(Date.now());
    }, SAVE_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [draft, viewerId, loadedFor]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      titleRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const update = (patch: Partial<BlogDraft>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    setSavedAt(null);
    if (attempted) setErrors(validateBlogDraft(next).errors);
  };

  const handleSubmit = async (event?: SubmitEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (publishing) return;

    setAttempted(true);
    const { values, errors: found } = validateBlogDraft(draft);
    setErrors(found);
    if (!values) {
      if (found.title) titleRef.current?.focus();
      else if (found.categoryIds) firstCategoryRef.current?.focus();
      else editorRef.current?.focus();
      return;
    }

    setStatus('publishing');
    setFailure(null);
    try {
      const blog = await createBlog(values);
      if (viewerId !== null) saveDraft(viewerId, EMPTY_DRAFT);
      setDraft(EMPTY_DRAFT);
      setErrors({});
      setAttempted(false);
      setStatus('idle');
      onPublished(blog);
    } catch (error) {
      setStatus('error');
      if (!(error instanceof ApiError)) return;
      // Field problems the server found go back on the fields themselves.
      const fieldErrors = Object.fromEntries(
        Object.entries(error.fields).filter(([key]) => DRAFT_FIELDS.has(key)),
      ) as BlogDraftErrors;
      if (Object.keys(fieldErrors).length > 0) setErrors(fieldErrors);
      if (error.code === 'RATE_LIMITED' || error.code === 'ACCOUNT_NOT_APPROVED') {
        setFailure(error.message);
      }
    }
  };

  const words = countWords(draft.text);
  const titleLength = draft.title.trim().length;
  const bodyLength = draft.text.trim().length;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={headingId}
      onClose={onClose}
      onCancel={(e) => {
        // Don't abandon an in-flight publish.
        if (publishing) e.preventDefault();
      }}
      className={cn(
        'm-0 size-full max-h-none max-w-none bg-bg p-0 text-text open:flex open:flex-col',
        'backdrop:bg-primary/60',
        'sm:max-w-4xl sm:m-auto sm:h-[min(92dvh,64rem)] sm:w-[calc(100%-3rem)] sm:border sm:border-border',
      )}
    >
      <form
        ref={formRef}
        noValidate
        onSubmit={(e) => void handleSubmit(e)}
        className="flex min-h-0 flex-1 flex-col motion-safe:animate-sheet"
      >
        <header className="flex shrink-0 items-center gap-2 border-b border-border px-2 py-2 sm:px-6 sm:py-4">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close composer. Your draft is kept."
            className="grid size-11 place-items-center text-text-muted transition-colors hover:text-text sm:order-last sm:-mr-3"
          >
            <CloseIcon className="size-5" />
          </button>
          <h2 id={headingId} className="flex-1 text-h3">
            Write a blog
          </h2>
          <Button
            type="submit"
            aria-disabled={publishing || undefined}
            className="min-h-10 px-4 sm:hidden"
          >
            {publishing ? 'Publishing…' : 'Publish'}
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-gutter py-6 sm:px-8">
          {viewer && (
            <div className="flex items-center gap-3 text-sm">
              <Avatar user={viewer} />
              <p className="min-w-0">
                <span className="block truncate font-medium">{viewer.name}</span>
                <span className="block truncate text-xs text-text-muted">{viewer.profession}</span>
              </p>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-7">
            <Field
              label="Title"
              error={errors.title}
              hint={`Specific titles get read. ${BLOG_RULES.titleMin}–${BLOG_RULES.titleMax} characters.`}
            >
              {(control) => (
                <div>
                  <Input
                    {...control}
                    ref={titleRef}
                    name="title"
                    autoComplete="off"
                    maxLength={BLOG_RULES.titleMax + 20}
                    value={draft.title}
                    onChange={(e) => {
                      update({ title: e.target.value });
                    }}
                    className="font-display text-h3"
                  />
                  <div className="mt-1 flex justify-end">
                    <CharacterCount count={titleLength} max={BLOG_RULES.titleMax} />
                  </div>
                </div>
              )}
            </Field>

            <CategoryChoice
              legend="Categories"
              hint="Choose every category your blog is about."
              mode="multiple"
              options={categories.status === 'ready' ? categories.categories : categories.status}
              onRetry={categories.retry}
              value={draft.categoryIds}
              onChange={(ids) => {
                update({ categoryIds: ids });
              }}
              error={errors.categoryIds}
              firstRef={firstCategoryRef}
            />

            <div className="flex flex-col gap-1.5">
              <span id={bodyLabelId} className="text-sm text-text-muted">
                Your blog
              </span>
              {open && (
                <Suspense fallback={<EditorSkeleton />}>
                  <RichTextEditor
                    ref={editorRef}
                    initialContent={draft.content}
                    onChange={(content: RichDoc, text: string) => {
                      update({ content, text });
                    }}
                    labelId={bodyLabelId}
                    describedBy={cn(bodyHintId, errors.content && bodyErrorId) || undefined}
                    invalid={Boolean(errors.content)}
                    placeholder="Share a story, a lesson or advice from your own experience…"
                    onSubmitShortcut={() => {
                      formRef.current?.requestSubmit();
                    }}
                  />
                </Suspense>
              )}
              <div
                id={bodyHintId}
                className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted"
              >
                <span>
                  {plural(words, 'word', 'words')}
                  {words > 0 && ` · about ${estimateReadTime(draft.text)} min read`}
                  <span className="hidden sm:inline"> · Select text to format it</span>
                </span>
                <span className="flex items-center gap-3">
                  <span aria-live="polite">{savedAt !== null && 'Draft saved'}</span>
                  <CharacterCount count={bodyLength} max={BLOG_RULES.bodyMax} revealAt={0.8} />
                </span>
              </div>
              {errors.content && (
                <p id={bodyErrorId} className="text-sm text-danger">
                  {errors.content}
                </p>
              )}
            </div>
          </div>

          {status === 'error' && (
            <p role="alert" className="mt-6 text-sm text-danger">
              {failure ?? 'Your blog couldn’t be published. Please try again.'}
            </p>
          )}
        </div>

        <footer className="hidden shrink-0 items-center justify-between gap-4 border-t border-border px-8 py-4 sm:flex">
          <p className="text-xs text-text-muted">
            Your draft is saved in this browser. Ctrl/⌘ + Enter publishes.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button type="submit" aria-disabled={publishing || undefined}>
              {publishing ? 'Publishing…' : 'Publish'}
            </Button>
          </div>
        </footer>
      </form>
    </dialog>
  );
}

function EditorSkeleton() {
  return (
    <div aria-busy="true" className="border border-border-strong bg-surface">
      <span className="sr-only">Loading the editor…</span>
      <div className="flex gap-1 border-b border-border px-2 py-1.5">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="size-9" />
        ))}
      </div>
      <div className="min-h-72 p-4">
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}
