import { useEffect, useRef, useState, type ReactNode, type SubmitEvent } from 'react';

import { Button } from '../../../components/ui/Button';
import { ApiError } from '../../../lib/api';
import { useFocusFirstInvalid } from '../../auth/useFocusFirstInvalid';
import { useProfileOptions } from '../api';
import {
  STEPS,
  STEP_FIELDS,
  toApplicationInput,
  toDraftField,
  validateStep,
  type ApplicationDraft,
  type DraftErrors,
  type StepId,
} from '../model';
import type { ApplicationInput } from '../types';
import { StepFields, type UpdateDraft } from './ApplicationSteps';
import { StepProgress } from './StepProgress';

interface ApplicationFormProps {
  /** Sign-up asks for an email and password first; a reapplication doesn't. */
  mode: 'signup' | 'reapply';
  initialDraft: ApplicationDraft;
  /** Told about every change, so a parent can keep the answers across a remount. */
  onDraftChange?: (draft: ApplicationDraft) => void;
  /** Steps the page shows before this form (sign-up's invitation code), for the numbering. */
  stepsBefore?: number;
  /** Shown above the questions on every step, e.g. the invitation code. */
  header?: ReactNode;
  /** Back on the first step: return to whatever came before the form (sign-up's code step). */
  onBackFromStart?: () => void;
  /** Under the final button. */
  footnote?: ReactNode;
  submitLabel: string;
  busyLabel: string;
  /**
   * Sends the application. Resolve when done; reject with an ApiError and the form shows
   * field errors on their step, or a message for anything else.
   */
  onSubmit: (input: ApplicationInput, draft: ApplicationDraft) => Promise<void>;
}

/**
 * The membership application as short steps, each checked before moving on, with a
 * progress bar and Back / Continue that keep every answer. The final step sends it all.
 * Mobile first: one column, large targets, focus on each new step's heading.
 */
export function ApplicationForm({
  mode,
  initialDraft,
  onDraftChange,
  stepsBefore = 0,
  header,
  onBackFromStart,
  footnote,
  submitLabel,
  busyLabel,
  onSubmit,
}: ApplicationFormProps) {
  const steps = mode === 'signup' ? STEPS : STEPS.filter((step) => step.id !== 'account');
  const [draft, setDraft] = useState(initialDraft);
  const [index, setIndex] = useState(0);
  const [errors, setErrors] = useState<DraftErrors>({});
  /** Steps whose Continue was pressed: their errors update as she types. */
  const [checked, setChecked] = useState<ReadonlySet<StepId>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formRef, focusFirstInvalid] = useFocusFirstInvalid<HTMLFormElement>();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const shownIndex = useRef(index);
  const options = useProfileOptions();

  const step = steps[index] ?? steps[0];
  const isLast = index === steps.length - 1;
  const total = stepsBefore + steps.length;

  // A new step: start at its top and announce it by focusing its heading.
  useEffect(() => {
    if (shownIndex.current === index) return;
    shownIndex.current = index;
    headingRef.current?.focus({ preventScroll: true });
    headingRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [index]);

  const update: UpdateDraft = (key, value) => {
    const next = { ...draft, [key]: value };
    setDraft(next);
    onDraftChange?.(next);
    if (checked.has(step.id)) setErrors(validateStep(step.id, next));
  };

  /** Moves to another step, showing its errors only if its Continue was already pressed. */
  const goTo = (target: number) => {
    const id = steps[target]?.id;
    setFormError(null);
    setIndex(target);
    setErrors(id !== undefined && checked.has(id) ? validateStep(id, draft) : {});
  };

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setChecked((prev) => new Set(prev).add(step.id));
    const found = validateStep(step.id, draft);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      focusFirstInvalid();
      return;
    }
    if (!isLast) {
      goTo(index + 1);
      return;
    }

    // Every step again: an earlier answer may have been changed since (e.g. via Back).
    for (const [i, { id }] of steps.entries()) {
      const stale = validateStep(id, draft);
      if (Object.keys(stale).length > 0) {
        setChecked((prev) => new Set(prev).add(id));
        setIndex(i);
        setErrors(stale);
        focusFirstInvalid();
        return;
      }
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await onSubmit(toApplicationInput(draft), draft);
    } catch (error) {
      showApiError(error);
    } finally {
      setSubmitting(false);
    }
  };

  const showApiError = (error: unknown) => {
    if (error instanceof ApiError && Object.keys(error.fields).length > 0) {
      const fieldErrors: DraftErrors = {};
      for (const [apiField, message] of Object.entries(error.fields)) {
        const field = toDraftField(apiField);
        if (field) fieldErrors[field] ??= message;
      }
      const first = steps.findIndex(({ id }) =>
        STEP_FIELDS[id].some((field) => fieldErrors[field] !== undefined),
      );
      const target = steps[first];
      if (target) {
        setChecked((prev) => new Set(prev).add(target.id));
        setIndex(first);
        setErrors(fieldErrors);
        focusFirstInvalid();
        return;
      }
    }
    setFormError(
      error instanceof ApiError && error.code === 'RATE_LIMITED'
        ? 'Too many attempts. Please wait a few minutes and try again.'
        : error instanceof ApiError && error.status === 0
          ? 'Check your connection, then try again. Your answers are still here.'
          : 'Your application couldn’t be sent. Please try again; your answers are still here.',
    );
  };

  return (
    <form
      ref={formRef}
      noValidate
      aria-labelledby="application-step-title"
      onSubmit={(e) => void handleSubmit(e)}
      aria-busy={submitting || undefined}
      className="flex flex-col gap-7"
    >
      <div className="flex flex-col gap-3">
        <StepProgress current={stepsBefore + index} total={total} />
        <h2
          id="application-step-title"
          ref={headingRef}
          tabIndex={-1}
          className="scroll-mt-24 font-sans text-xs tracking-caps text-text-muted uppercase"
        >
          Step {stepsBefore + index + 1} of {total}: {step.title}
        </h2>
      </div>

      {header}

      <StepFields step={step.id} draft={draft} errors={errors} update={update} options={options} />

      {formError && (
        <p role="alert" className="border-l-2 border-danger pl-3 text-sm text-danger">
          {formError}
        </p>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex gap-3">
          {(index > 0 || onBackFromStart) && (
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => {
                if (submitting) return;
                if (index > 0) goTo(index - 1);
                else onBackFromStart?.();
              }}
              aria-disabled={submitting || undefined}
            >
              Back
            </Button>
          )}
          <Button
            type="submit"
            size="lg"
            className="flex-1"
            aria-disabled={submitting || undefined}
          >
            {isLast ? (submitting ? busyLabel : submitLabel) : 'Continue'}
          </Button>
        </div>
        {isLast && footnote}
      </div>
    </form>
  );
}
