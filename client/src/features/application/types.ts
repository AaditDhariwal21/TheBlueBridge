import type { AppliedRole } from '../auth/types';

/** Shapes of the membership application (server/src/features/users and profileOptions). */

/** One answer to an option-set question: a stable code and the label people read. */
export interface ProfileOption {
  code: string;
  label: string;
}

/** GET /api/profile-options: the choices the application offers. */
export interface ProfileOptions {
  jodhpurConnections: ProfileOption[];
  journeyStages: ProfileOption[];
  joinReasons: ProfileOption[];
  weeklyHours: ProfileOption[];
}

/**
 * The application answers beyond name, phone and occupation, as the API returns them on a
 * profile. Null or empty for members who joined before the expanded application.
 */
export interface ApplicationDetails {
  maidenName: string | null;
  city: string | null;
  state: string | null;
  /** ISO 3166-1 alpha-2. */
  country: string | null;
  jodhpurConnections: ProfileOption[];
  connectionOther: string | null;
  schoolPassYear: number | null;
  schoolName: string | null;
  /** A year such as "2012", or "NA". */
  collegePassYear: string | null;
  collegeName: string | null;
  highestDegree: string | null;
  profession: string | null;
  linkedinUrl: string | null;
  journeyStage: ProfileOption | null;
  journeyStageOther: string | null;
  joinReasons: ProfileOption[];
  joinReasonOther: string | null;
  /** Ambassadors: the hours a week they can offer. */
  weeklyHours: ProfileOption | null;
}

/** What POST /api/me/reapply takes, and sign-up takes with the account fields. */
export interface ApplicationInput {
  name: string;
  maidenName: string | null;
  phoneNumber: string;
  city: string;
  state: string;
  country: string;
  jodhpurConnections: string[];
  connectionOther: string | null;
  schoolPassYear: number;
  schoolName: string | null;
  collegePassYear: number | 'NA';
  collegeName: string | null;
  highestDegree: string;
  profession: string;
  occupation: string;
  linkedinUrl: string | null;
  journeyStage: string;
  journeyStageOther: string | null;
  joinReasons: string[];
  joinReasonOther: string | null;
  appliedRole: AppliedRole;
  categoryIds: string[];
  weeklyHours: string | null;
}
