import { useId, useRef, useState, type ReactNode, type SubmitEvent } from 'react';

import { ApiError } from '../../lib/api';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { DialogHeader } from './DialogHeader';
import { Field } from './Field';
import { Textarea } from './Textarea';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** What will happen, in plain words. */
  children: ReactNode;
  confirmLabel: string;
  busyLabel: string;
  /** `danger` for destructive actions. */
  tone?: 'default' | 'danger';
  /** Offers an optional, length-limited reason (recorded with the action). */
  reason?: { label: string; max: number };
  /** Resolves when done (the parent then closes the dialog); a rejection is shown here. */
  onConfirm: (reason: string | null) => Promise<void>;
  onClose: () => void;
}

/**
 * "Are you sure?" for consequential actions, with an optional reason. Stays open while the
 * request runs, and shows a failure inside the dialog so it can be retried.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  busyLabel,
  tone = 'default',
  reason,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const headingId = useId();
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState('');
  const [reasonError, setReasonError] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const close = () => {
    if (busy) return;
    setText('');
    setReasonError(undefined);
    setFailure(null);
    onClose();
  };

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const trimmed = text.replace(/\s+/g, ' ').trim();
    if (reason && trimmed.length > reason.max) {
      setReasonError(`Keep the reason under ${reason.max} characters.`);
      reasonRef.current?.focus();
      return;
    }
    setReasonError(undefined);
    setFailure(null);
    setBusy(true);
    try {
      await onConfirm(trimmed || null);
      setText('');
    } catch (error) {
      setFailure(error instanceof ApiError ? error.message : 'That didn’t work. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={close} labelledBy={headingId} dismissible={!busy}>
      <DialogHeader id={headingId} title={title} onClose={close} closeDisabled={busy} />
      <form
        noValidate
        onSubmit={(e) => void handleSubmit(e)}
        aria-busy={busy || undefined}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-gutter py-5 sm:px-6">
          <div className="text-sm text-text-muted">{children}</div>
          {reason && (
            <Field
              label={reason.label}
              hint={`Optional. Up to ${reason.max} characters; kept in the activity log.`}
              error={reasonError}
            >
              {(control) => (
                <Textarea
                  {...control}
                  ref={reasonRef}
                  rows={2}
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                  }}
                />
              )}
            </Field>
          )}
          {failure && (
            <p role="alert" className="border-l-2 border-danger pl-3 text-sm text-danger">
              {failure}
            </p>
          )}
        </div>
        <footer className="flex shrink-0 justify-end gap-3 border-t border-border px-gutter py-4 sm:px-6">
          <Button variant="outline" onClick={close} aria-disabled={busy || undefined}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant={tone === 'danger' ? 'danger' : 'solid'}
            aria-disabled={busy || undefined}
          >
            {busy ? busyLabel : confirmLabel}
          </Button>
        </footer>
      </form>
    </Dialog>
  );
}
