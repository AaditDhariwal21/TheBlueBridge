import type { ReactNode } from 'react';

import { AnswerIcon, PenIcon } from './Icons';
import { PANEL, PANEL_TITLE } from './surface';

/** A short, static explainer: the two things anyone can do here, one or the other. */
export function HowBlogsWork() {
  return (
    <section aria-labelledby="how-blogs-work-title" className={`${PANEL} p-6`}>
      <h2 id="how-blogs-work-title" className={PANEL_TITLE}>
        How Blogs Work
      </h2>
      <div className="mt-4">
        <Way icon={<PenIcon />} title="Share a story or a lesson">
          Write a blog about your work and what you learned, for the whole community to read.
        </Way>
        <p className="my-4 flex items-center gap-3 text-meta text-text-muted">
          <span aria-hidden="true" className="h-px flex-1 bg-border" />
          or
          <span aria-hidden="true" className="h-px flex-1 bg-border" />
        </p>
        <Way icon={<AnswerIcon />} title="Ask a query">
          Each category has a Query Blog. Post your question there and its ambassadors answer.
        </Way>
      </div>
    </section>
  );
}

function Way({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span aria-hidden="true" className="mt-0.5 text-text-muted">
        {icon}
      </span>
      <div className="min-w-0">
        <h3 className="font-sans text-sm font-medium text-text">{title}</h3>
        <p className="text-sm text-text-muted">{children}</p>
      </div>
    </div>
  );
}
