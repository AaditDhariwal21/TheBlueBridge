import { useEffect, useId, useRef, useState, type SubmitEvent } from 'react';

import { Button } from '../../../../components/ui/Button';
import { Field } from '../../../../components/ui/Field';
import { Input } from '../../../../components/ui/Input';
import { Textarea } from '../../../../components/ui/Textarea';
import { ApiError } from '../../../../lib/api';
import { cn } from '../../../../lib/cn';
import type { Category, QueryBlog } from '../../model/types';
import {
  QUERY_BLOG_RULES,
  validateQueryBlogDraft,
  type QueryBlogDraft,
  type QueryBlogDraftErrors,
} from '../../model/validation';
import { useCreateQueryBlog } from '../../state/hooks';
import { CategoryChoice } from '../shared/CategoryChoice';
import { CharacterCount } from '../shared/CharacterCount';
import { CloseIcon } from '../shared/Icons';

/** Every Query Blog gets a systematic name: this prefix, then the category's name. */
const TITLE_PREFIX = 'Official Query Blog - ';
const EMPTY: QueryBlogDraft = { categoryId: '', title: TITLE_PREFIX, description: '' };

/** True while the title is still the generated one (or just the prefix), so it may be replaced. */
function isGeneratedTitle(title: string, categories: readonly Category[]): boolean {
  if (title.trim() === TITLE_PREFIX.trim()) return true;
  return categories.some((category) => title === TITLE_PREFIX + category.name);
}

interface QueryBlogComposerProps {
  open: boolean;
  /** Categories that have no Query Blog yet (only admins open this). */
  categories: Category[];
  onClose: () => void;
  onCreated: (queryBlog: QueryBlog) => void;
}

/**
 * "Start a Query Blog", for admins. The title is filled in from the chosen
 * category ("Official Query Blog - Finance") and stays editable.
 * Same native-dialog pattern as the blog composer: inert background, Escape
 * closes, focus returns to the opener.
 */
export function QueryBlogComposer({
  open,
  categories,
  onClose,
  onCreated,
}: QueryBlogComposerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const firstCategoryRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const headingId = useId();

  const [draft, setDraft] = useState<QueryBlogDraft>(EMPTY);
  const [errors, setErrors] = useState<QueryBlogDraftErrors>({});
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const createQueryBlog = useCreateQueryBlog();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      firstCategoryRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const update = <K extends keyof QueryBlogDraft>(field: K, value: QueryBlogDraft[K]) => {
    const next = { ...draft, [field]: value };
    setDraft(next);
    if (attempted) setErrors(validateQueryBlogDraft(next).errors);
  };

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;

    setAttempted(true);
    setFailure(null);
    const { values, errors: found } = validateQueryBlogDraft(draft);
    setErrors(found);
    if (!values) {
      if (found.categoryId) firstCategoryRef.current?.focus();
      else if (found.title) titleRef.current?.focus();
      else descriptionRef.current?.focus();
      return;
    }

    setSaving(true);
    try {
      const queryBlog = await createQueryBlog(values);
      setDraft(EMPTY);
      setAttempted(false);
      onCreated(queryBlog);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'CONFLICT') {
        setErrors({ categoryId: 'This category already has a Query Blog.' });
      } else if (error instanceof ApiError && error.code === 'VALIDATION_FAILED') {
        setErrors(error.fields);
      } else {
        setFailure(
          error instanceof ApiError && error.status === 403
            ? error.message
            : 'The Query Blog couldn’t be created. Please try again.',
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const r = QUERY_BLOG_RULES;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={headingId}
      onClose={onClose}
      onCancel={(e) => {
        if (saving) e.preventDefault();
      }}
      className={cn(
        'm-0 size-full max-h-none max-w-none bg-bg p-0 text-text open:flex open:flex-col',
        'backdrop:bg-primary/60',
        'sm:max-w-xl sm:m-auto sm:h-auto sm:max-h-[min(92dvh,44rem)] sm:w-[calc(100%-3rem)] sm:border sm:border-border',
      )}
    >
      <form
        noValidate
        onSubmit={(e) => void handleSubmit(e)}
        className="flex min-h-0 flex-1 flex-col motion-safe:animate-sheet"
      >
        <header className="flex shrink-0 items-center gap-2 border-b border-border px-2 py-2 sm:px-6 sm:py-4">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-11 place-items-center text-text-muted transition-colors hover:text-text sm:order-last sm:-mr-3"
          >
            <CloseIcon className="size-5" />
          </button>
          <h2 id={headingId} className="flex-1 text-h3">
            Start a Query Blog
          </h2>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-7 overflow-y-auto overscroll-contain px-gutter py-6 sm:px-6">
          <p className="text-sm text-text-muted">
            A pinned space where any member can ask about one category, and its ambassadors answer.
            Each category has one.
          </p>

          <CategoryChoice
            legend="Category"
            mode="single"
            options={categories}
            onRetry={() => undefined}
            value={draft.categoryId ? [draft.categoryId] : []}
            onChange={([id = '']) => {
              const category = categories.find((c) => c.id === id);
              // Fill in the name unless the admin has written their own title.
              const title =
                category && isGeneratedTitle(draft.title, categories)
                  ? TITLE_PREFIX + category.name
                  : draft.title;
              const next = { ...draft, categoryId: id, title };
              setDraft(next);
              if (attempted) setErrors(validateQueryBlogDraft(next).errors);
            }}
            error={errors.categoryId}
            firstRef={firstCategoryRef}
          />

          <Field
            label="Title"
            error={errors.title}
            hint="Filled in from the category. You can change it."
          >
            {(control) => (
              <div>
                <Input
                  {...control}
                  ref={titleRef}
                  name="title"
                  autoComplete="off"
                  maxLength={r.titleMax + 20}
                  value={draft.title}
                  onChange={(e) => {
                    update('title', e.target.value);
                  }}
                  className="font-display text-h3"
                />
                <div className="mt-1 flex justify-end">
                  <CharacterCount count={draft.title.trim().length} max={r.titleMax} />
                </div>
              </div>
            )}
          </Field>

          <Field
            label="What can people ask here?"
            error={errors.description}
            hint={`${r.descriptionMin}–${r.descriptionMax} characters, shown under the title.`}
          >
            {(control) => (
              <div>
                <Textarea
                  {...control}
                  ref={descriptionRef}
                  name="description"
                  rows={3}
                  value={draft.description}
                  onChange={(e) => {
                    update('description', e.target.value);
                  }}
                  placeholder="Contracts, workplace rights, property and paperwork, in plain words."
                />
                <div className="mt-1 flex justify-end">
                  <CharacterCount count={draft.description.trim().length} max={r.descriptionMax} />
                </div>
              </div>
            )}
          </Field>

          {failure && (
            <p role="alert" className="text-sm text-danger">
              {failure}
            </p>
          )}
        </div>

        <footer className="flex shrink-0 justify-end gap-3 border-t border-border px-gutter py-4 sm:px-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" aria-disabled={saving || undefined}>
            {saving ? 'Creating…' : 'Create'}
          </Button>
        </footer>
      </form>
    </dialog>
  );
}
