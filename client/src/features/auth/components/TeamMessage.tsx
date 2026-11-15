import { useId } from 'react';

/**
 * The note an admin wrote when deciding on her application, as she sees it. Plain text,
 * rendered as text.
 */
export function TeamMessage({ note }: { note: string }) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="border-l-2 border-accent bg-surface p-4">
      <h2 id={titleId} className="font-sans text-xs tracking-caps text-text-muted uppercase">
        Message from the Blue Bridge team
      </h2>
      <p className="mt-2 wrap-break-word whitespace-pre-line text-text">{note}</p>
    </section>
  );
}
