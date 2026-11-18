import type { ReactNode } from 'react';

import { AnswerIcon, CommentIcon, PenIcon } from './Icons';
import { PANEL, PANEL_TITLE } from './surface';

const STEPS: { icon: ReactNode; title: string; text: string }[] = [
  {
    icon: <PenIcon />,
    title: 'Share a story or a lesson',
    text: 'Members write about their work and what they learned.',
  },
  {
    icon: <CommentIcon />,
    title: 'Ask in a Query Blog',
    text: 'One per category, pinned. Any member can ask.',
  },
  {
    icon: <AnswerIcon />,
    title: 'Ambassadors answer',
    text: 'They reply to queries in their own categories.',
  },
];

/** A short, static explainer: the left column on wide screens, under the Query Blogs otherwise. */
export function HowBlogsWork() {
  return (
    <section aria-labelledby="how-blogs-work-title" className={`${PANEL} p-6`}>
      <h2 id="how-blogs-work-title" className={PANEL_TITLE}>
        How Blogs Work
      </h2>
      <ol className="mt-4 flex flex-col gap-4">
        {STEPS.map((step) => (
          <li key={step.title} className="flex gap-3">
            <span aria-hidden="true" className="mt-0.5 text-text-muted">
              {step.icon}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-text">{step.title}</p>
              <p className="text-sm text-text-muted">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
