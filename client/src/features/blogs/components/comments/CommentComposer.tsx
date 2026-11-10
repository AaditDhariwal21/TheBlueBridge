import { useEffect, useId, useRef, useState, type KeyboardEvent, type SubmitEvent } from 'react';

import { CURRENT_USER } from '../../../../app/currentUser';
import { Button } from '../../../../components/ui/Button';
import { Textarea } from '../../../../components/ui/Textarea';
import { cn } from '../../../../lib/cn';
import { COMMENT_MAX, normaliseText } from '../../model/validation';
import { Avatar } from '../shared/Avatar';
import { CharacterCount } from '../shared/CharacterCount';

/** The character count appears once the text reaches 80% of the limit. */
const COUNT_REVEAL = 0.8;

interface CommentComposerProps {
  label: string;
  placeholder: string;
  submitLabel: string;
  /** Resolves when posted; rejects to show an error and keep the text. */
  onSubmit: (body: string) => Promise<void>;
  /** Inline reply boxes can be cancelled (button or Escape). */
  onCancel?: () => void;
  variant?: 'top' | 'inline';
  /** Focus the field on mount (inline reply boxes). */
  focusOnMount?: boolean;
}

/**
 * Text box for a new comment, query or reply, as the session user.
 * Ctrl/⌘ + Enter posts. Errors are linked to the field and announced.
 */
export function CommentComposer({
  label,
  placeholder,
  submitLabel,
  onSubmit,
  onCancel,
  variant = 'top',
  focusOnMount = false,
}: CommentComposerProps) {
  const fieldId = useId();
  const errorId = useId();
  const countId = useId();
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (focusOnMount) fieldRef.current?.focus();
  }, [focusOnMount]);

  const isEmpty = value.trim() === '';
  const inline = variant === 'inline';

  const submit = async () => {
    if (posting) return;
    const body = normaliseText(value);
    if (!body) {
      setError('Write something before posting.');
      fieldRef.current?.focus();
      return;
    }
    if (body.length > COMMENT_MAX) {
      setError(`Please keep it under ${COMMENT_MAX.toLocaleString('en-IN')} characters.`);
      fieldRef.current?.focus();
      return;
    }
    setPosting(true);
    setError(null);
    try {
      await onSubmit(body);
      setValue('');
    } catch {
      setError('That didn’t post. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void submit();
    } else if (event.key === 'Escape' && onCancel) {
      event.preventDefault();
      onCancel();
    }
  };

  const showCount = value.trim().length >= COMMENT_MAX * COUNT_REVEAL;
  const describedBy =
    [error ? errorId : null, showCount ? countId : null].filter(Boolean).join(' ') || undefined;

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      aria-label={label}
      className={cn('flex gap-3', inline && 'mt-3')}
    >
      {!inline && <Avatar user={CURRENT_USER} className="mt-1 hidden sm:grid" />}
      <div className="min-w-0 flex-1">
        <label htmlFor={fieldId} className="sr-only">
          {label}
        </label>
        <Textarea
          ref={fieldRef}
          id={fieldId}
          value={value}
          rows={inline ? 2 : 3}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            'field-sizing-content max-h-80 text-base',
            inline ? 'min-h-20' : 'min-h-24',
          )}
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="min-w-0 text-xs text-text-muted">
            {error ? (
              <p id={errorId} role="alert" className="text-sm text-danger">
                {error}
              </p>
            ) : (
              <span className="hidden sm:inline">Ctrl/⌘ + Enter to post</span>
            )}
            <CharacterCount
              id={countId}
              count={value.trim().length}
              max={COMMENT_MAX}
              revealAt={COUNT_REVEAL}
              className="block"
            />
          </div>
          <div className="ml-auto flex gap-2">
            {onCancel && (
              <Button variant="outline" onClick={onCancel} className="px-4">
                Cancel
              </Button>
            )}
            <Button type="submit" aria-disabled={posting || isEmpty || undefined} className="px-5">
              {posting ? 'Posting…' : submitLabel}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
