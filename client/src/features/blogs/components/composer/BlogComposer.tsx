import { useEffect, useId, useRef, useState, type SubmitEvent } from 'react';

import { CURRENT_USER } from '../../../../app/currentUser';
import { Button } from '../../../../components/ui/Button';
import { Field } from '../../../../components/ui/Field';
import { Input } from '../../../../components/ui/Input';
import { Textarea } from '../../../../components/ui/Textarea';
import { cn } from '../../../../lib/cn';
import { countWords, estimateReadTime, plural } from '../../lib/text';
import { CATEGORIES } from '../../model/categories';
import type { Blog } from '../../model/types';
import {
  BLOG_RULES,
  validateBlogDraft,
  type BlogDraft,
  type BlogDraftErrors,
} from '../../model/validation';
import { useCreateBlog } from '../../state/hooks';
import { Avatar } from '../shared/Avatar';
import { CharacterCount } from '../shared/CharacterCount';
import { CloseIcon } from '../shared/Icons';

const EMPTY_DRAFT: BlogDraft = { title: '', body: '', categoryId: '' };

interface BlogComposerProps {
  open: boolean;
  onClose: () => void;
  onPublished: (blog: Blog) => void;
}

/**
 * "Write a blog". A native modal <dialog>: full-screen sheet on phones,
 * centred modal from `sm` up. The rest of the page is inert while it is open,
 * Escape closes it, and focus returns to the button that opened it.
 *
 * Closing keeps the draft for the session; only publishing clears it.
 */
export function BlogComposer({ open, onClose, onPublished }: BlogComposerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const firstCategoryRef = useRef<HTMLInputElement>(null);
  const headingId = useId();
  const formId = useId();
  const categoryErrorId = useId();

  const [draft, setDraft] = useState<BlogDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<BlogDraftErrors>({});
  const [attempted, setAttempted] = useState(false);
  const [status, setStatus] = useState<'idle' | 'publishing' | 'error'>('idle');
  const createBlog = useCreateBlog();

  const publishing = status === 'publishing';

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

  const update = <K extends keyof BlogDraft>(field: K, value: BlogDraft[K]) => {
    const next = { ...draft, [field]: value };
    setDraft(next);
    if (attempted) setErrors(validateBlogDraft(next).errors);
  };

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (publishing) return;

    setAttempted(true);
    const { values, errors: found } = validateBlogDraft(draft);
    setErrors(found);
    if (!values) {
      if (found.title) titleRef.current?.focus();
      else if (found.categoryId) firstCategoryRef.current?.focus();
      else bodyRef.current?.focus();
      return;
    }

    setStatus('publishing');
    try {
      const blog = await createBlog(values);
      setDraft(EMPTY_DRAFT);
      setErrors({});
      setAttempted(false);
      setStatus('idle');
      onPublished(blog);
    } catch {
      setStatus('error');
    }
  };

  const words = countWords(draft.body);
  const titleLength = draft.title.trim().length;
  const bodyLength = draft.body.trim().length;

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
        'sm:max-w-2xl sm:m-auto sm:h-auto sm:max-h-[min(92dvh,56rem)] sm:w-[calc(100%-3rem)] sm:border sm:border-border',
      )}
    >
      <form
        id={formId}
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

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-gutter py-6 sm:px-6">
          <div className="flex items-center gap-3 text-sm">
            <Avatar user={CURRENT_USER} />
            <p className="min-w-0">
              <span className="block truncate font-medium">{CURRENT_USER.name}</span>
              <span className="block truncate text-xs text-text-muted">
                {CURRENT_USER.profession}
              </span>
            </p>
          </div>

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
                      update('title', e.target.value);
                    }}
                    className="font-display text-h3"
                  />
                  <div className="mt-1 flex justify-end">
                    <CharacterCount count={titleLength} max={BLOG_RULES.titleMax} />
                  </div>
                </div>
              )}
            </Field>

            <fieldset aria-describedby={errors.categoryId ? categoryErrorId : undefined}>
              <legend className="text-sm text-text-muted">Category</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {CATEGORIES.map((category, i) => (
                  <label key={category.id} className="relative">
                    <input
                      ref={i === 0 ? firstCategoryRef : undefined}
                      type="radio"
                      name="category"
                      value={category.id}
                      checked={draft.categoryId === category.id}
                      onChange={() => {
                        update('categoryId', category.id);
                      }}
                      className="peer sr-only"
                    />
                    <span
                      className={cn(
                        'inline-flex min-h-11 cursor-pointer items-center gap-2 border px-3 text-sm transition-colors',
                        'border-border bg-surface text-text-muted hover:border-border-strong hover:text-text',
                        'peer-checked:border-primary peer-checked:bg-primary peer-checked:text-on-primary',
                        'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus',
                        errors.categoryId && 'border-danger',
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          'size-1.5 rounded-full',
                          category.tone === 'blue' ? 'bg-accent-soft' : 'bg-accent-2-soft',
                        )}
                      />
                      {category.label}
                    </span>
                  </label>
                ))}
              </div>
              {errors.categoryId && (
                <p id={categoryErrorId} className="mt-2 text-sm text-danger">
                  {errors.categoryId}
                </p>
              )}
            </fieldset>

            <Field
              label="Your blog"
              error={errors.body}
              hint="Leave a blank line between paragraphs."
            >
              {(control) => (
                <div>
                  <Textarea
                    {...control}
                    ref={bodyRef}
                    name="body"
                    rows={10}
                    value={draft.body}
                    onChange={(e) => {
                      update('body', e.target.value);
                    }}
                    placeholder="Share a story, a lesson or advice from your own experience…"
                    className="min-h-64 leading-relaxed"
                  />
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">
                    <span>
                      {plural(words, 'word', 'words')}
                      {words > 0 && ` · about ${estimateReadTime(draft.body)} min read`}
                    </span>
                    <CharacterCount count={bodyLength} max={BLOG_RULES.bodyMax} revealAt={0.8} />
                  </div>
                </div>
              )}
            </Field>
          </div>

          {status === 'error' && (
            <p role="alert" className="mt-6 text-sm text-danger">
              Your blog couldn’t be published. Please try again.
            </p>
          )}
        </div>

        <footer className="hidden shrink-0 items-center justify-between gap-4 border-t border-border px-6 py-4 sm:flex">
          <p className="text-xs text-text-muted">Closing keeps your draft for this session.</p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
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
