import type { ReactNode } from 'react';

import { NOT_APPLICABLE, OTHER_OPTION } from '../../../../shared/limits';
import { countryName } from './countries';
import type { ApplicationDetails, ProfileOption } from './types';

export type DetailRow = [term: string, detail: ReactNode];

const LINK =
  'text-text underline decoration-accent-soft underline-offset-4 wrap-anywhere hover:decoration-text';

/** "Born here, Other (my grandparents' town)". */
function answers(options: readonly ProfileOption[], other: string | null): string {
  return options
    .map((option) => (option.code === OTHER_OPTION && other ? `Other: ${other}` : option.label))
    .join(', ');
}

/** "St. Patrick's Vidya Bhawan, 2008", "Class of 2008", "Not applicable". */
function schooling(name: string | null, year: string | null): string | null {
  if (year === NOT_APPLICABLE) return name ? `${name} (not completed)` : 'Not applicable';
  if (name && year) return `${name}, ${year}`;
  return name ?? (year ? `Class of ${year}` : null);
}

/**
 * The application answers as definition-list rows, in reading order: where she lives, her
 * Jodhpur connection, education and work, her journey, and (ambassadors) hours offered.
 * Unanswered questions are left out, so members who joined before the expanded
 * application simply show fewer rows.
 */
export function applicationRows(details: ApplicationDetails): DetailRow[] {
  const rows: (DetailRow | null)[] = [
    details.maidenName ? ['Maiden name', details.maidenName] : null,
    details.city || details.country
      ? [
          'Lives in',
          [details.city, details.state, details.country && countryName(details.country)]
            .filter(Boolean)
            .join(', '),
        ]
      : null,
    details.jodhpurConnections.length > 0
      ? ['Connection to Jodhpur', answers(details.jodhpurConnections, details.connectionOther)]
      : null,
    details.profession ? ['Profession', details.profession] : null,
    details.highestDegree
      ? [
          'Highest degree',
          details.highestDegree === NOT_APPLICABLE ? 'Not applicable' : details.highestDegree,
        ]
      : null,
    toRow('School', schooling(details.schoolName, details.schoolPassYear?.toString() ?? null)),
    toRow('College', schooling(details.collegeName, details.collegePassYear)),
    details.linkedinUrl
      ? [
          'LinkedIn',
          <a
            key="linkedin"
            href={details.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={LINK}
          >
            {details.linkedinUrl.replace(/^https:\/\/(www\.)?/, '').replace(/\/$/, '')}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>,
        ]
      : null,
    details.journeyStage
      ? [
          'Journey',
          details.journeyStage.code === OTHER_OPTION && details.journeyStageOther
            ? details.journeyStageOther
            : details.journeyStage.label,
        ]
      : null,
    details.joinReasons.length > 0
      ? ['Here for', answers(details.joinReasons, details.joinReasonOther)]
      : null,
    details.weeklyHours ? ['Hours a week', details.weeklyHours.label] : null,
  ];
  return rows.filter((row) => row !== null);
}

function toRow(term: string, detail: string | null): DetailRow | null {
  return detail ? [term, detail] : null;
}
