import { DEFAULT_COUNTRY, isCountryCode } from '../../../../shared/countries';
import {
  EMAIL_MAX,
  NOT_APPLICABLE,
  OTHER_OPTION,
  PASSWORD_LIMITS,
  PROFILE_LIMITS,
  passYearRange,
} from '../../../../shared/limits';
import { splitE164, toE164 } from '../../../../shared/phone';
import {
  isNotApplicable,
  normalizeLinkedInUrl,
  parseCollegePassYear,
  parsePassYear,
} from '../../../../shared/profile';
import type { AppliedRole, Me } from '../auth/types';
import type { ApplicationInput } from './types';

/**
 * The application form's working copy: every answer as typed, so Back and Continue keep it.
 * Client checks mirror server/src/features/users/users.schemas.ts (same shared limits and
 * rules) for quick feedback; the API validates everything again.
 */
export interface ApplicationDraft {
  /* Account: sign-up only. */
  email: string;
  password: string;
  /* About you */
  name: string;
  maidenName: string;
  phoneCountry: string;
  phoneNational: string;
  city: string;
  state: string;
  country: string;
  /* Your Jodhpur connection */
  jodhpurConnections: string[];
  connectionOther: string;
  /* Education & work */
  schoolPassYear: string;
  schoolName: string;
  collegePassYear: string;
  collegeName: string;
  highestDegree: string;
  profession: string;
  occupation: string;
  linkedinUrl: string;
  /* Your journey */
  journeyStage: string;
  journeyStageOther: string;
  joinReasons: string[];
  joinReasonOther: string;
  /* Your role */
  appliedRole: AppliedRole | '';
  categoryIds: string[];
  weeklyHours: string;
}

export type DraftField = keyof ApplicationDraft;
export type DraftErrors = Partial<Record<DraftField, string>>;

export const STEPS = [
  { id: 'account', title: 'Your account' },
  { id: 'about', title: 'About you' },
  { id: 'jodhpur', title: 'Your Jodhpur connection' },
  { id: 'education', title: 'Education & work' },
  { id: 'journey', title: 'Your journey' },
  { id: 'role', title: 'Your role' },
] as const;

export type StepId = (typeof STEPS)[number]['id'];

/** Which answers each step holds, to send the applicant back to the right one. */
export const STEP_FIELDS: Record<StepId, readonly DraftField[]> = {
  account: ['email', 'password'],
  about: ['name', 'maidenName', 'phoneCountry', 'phoneNational', 'city', 'state', 'country'],
  jodhpur: ['jodhpurConnections', 'connectionOther'],
  education: [
    'schoolPassYear',
    'schoolName',
    'collegePassYear',
    'collegeName',
    'highestDegree',
    'profession',
    'occupation',
    'linkedinUrl',
  ],
  journey: ['journeyStage', 'journeyStageOther', 'joinReasons', 'joinReasonOther'],
  role: ['appliedRole', 'categoryIds', 'weeklyHours'],
};

export const EMPTY_DRAFT: ApplicationDraft = {
  email: '',
  password: '',
  name: '',
  maidenName: '',
  phoneCountry: DEFAULT_COUNTRY,
  phoneNational: '',
  city: '',
  state: '',
  country: DEFAULT_COUNTRY,
  jodhpurConnections: [],
  connectionOther: '',
  schoolPassYear: '',
  schoolName: '',
  collegePassYear: '',
  collegeName: '',
  highestDegree: '',
  profession: '',
  occupation: '',
  linkedinUrl: '',
  journeyStage: '',
  journeyStageOther: '',
  joinReasons: [],
  joinReasonOther: '',
  appliedRole: '',
  categoryIds: [],
  weeklyHours: '',
};

/** Her previous answers, to start a reapplication from. Missing ones start empty. */
export function draftFromMe(me: Me): ApplicationDraft {
  const phone = splitE164(me.phoneNumber);
  return {
    ...EMPTY_DRAFT,
    name: me.name,
    maidenName: me.maidenName ?? '',
    phoneCountry: phone?.country ?? DEFAULT_COUNTRY,
    phoneNational: phone?.national ?? me.phoneNumber,
    city: me.city ?? '',
    state: me.state ?? '',
    country: me.country ?? DEFAULT_COUNTRY,
    jodhpurConnections: me.jodhpurConnections.map((option) => option.code),
    connectionOther: me.connectionOther ?? '',
    schoolPassYear: me.schoolPassYear === null ? '' : String(me.schoolPassYear),
    schoolName: me.schoolName ?? '',
    collegePassYear: me.collegePassYear ?? '',
    collegeName: me.collegeName ?? '',
    highestDegree: me.highestDegree ?? '',
    profession: me.profession ?? '',
    occupation: me.occupation,
    linkedinUrl: me.linkedinUrl ?? '',
    journeyStage: me.journeyStage?.code ?? '',
    journeyStageOther: me.journeyStageOther ?? '',
    joinReasons: me.joinReasons.map((option) => option.code),
    joinReasonOther: me.joinReasonOther ?? '',
    appliedRole: me.role === 'admin' ? '' : me.role,
    categoryIds: me.categories.map((category) => category.id),
    weeklyHours: me.weeklyHours?.code ?? '',
  };
}

const L = PROFILE_LIMITS;
/** Small counts as words, for messages ("one to three"). */
const COUNT_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five'] as const;
const inWords = (n: number) => COUNT_WORDS[n] ?? String(n);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const collapse = (value: string) => value.replace(/\s+/g, ' ').trim();

function text(
  errors: DraftErrors,
  field: DraftField,
  value: string,
  max: number,
  required: string | null,
): void {
  const clean = collapse(value);
  if (!clean) {
    if (required) errors[field] = required;
  } else if (clean.length > max) {
    errors[field] = `Keep this under ${max.toLocaleString('en-IN')} characters.`;
  }
}

const yearRangeMessage = () => {
  const { min, max } = passYearRange();
  return `Enter a year between ${min} and ${max}`;
};

/** The problems on one step, by field. Empty when the step is complete. */
export function validateStep(step: StepId, draft: ApplicationDraft): DraftErrors {
  const errors: DraftErrors = {};
  const other = 'Tell us a little more.';
  switch (step) {
    case 'account': {
      const email = draft.email.trim().toLowerCase();
      if (!email) errors.email = 'Enter your email address.';
      else if (email.length > EMAIL_MAX || !EMAIL.test(email))
        errors.email = 'Enter a valid email address, like name@example.com.';
      if (draft.password.length < PASSWORD_LIMITS.min)
        errors.password = `Use at least ${PASSWORD_LIMITS.min} characters.`;
      else if (new TextEncoder().encode(draft.password).length > PASSWORD_LIMITS.maxBytes)
        errors.password = `Keep your password under ${PASSWORD_LIMITS.maxBytes} characters.`;
      break;
    }
    case 'about':
      text(errors, 'name', draft.name, L.nameMax, 'Enter your full name.');
      text(errors, 'maidenName', draft.maidenName, L.maidenNameMax, null);
      if (!draft.phoneNational.trim()) errors.phoneNational = 'Enter your mobile number.';
      else if (toE164(draft.phoneNational, draft.phoneCountry) === null)
        errors.phoneNational = 'Enter a valid mobile number for the country code you chose.';
      text(errors, 'city', draft.city, L.cityMax, 'Enter your city.');
      text(errors, 'state', draft.state, L.stateMax, 'Enter your state.');
      if (!isCountryCode(draft.country)) errors.country = 'Choose your country.';
      break;
    case 'jodhpur':
      if (draft.jodhpurConnections.length === 0)
        errors.jodhpurConnections = 'Choose at least one connection to Jodhpur.';
      if (draft.jodhpurConnections.includes(OTHER_OPTION))
        text(errors, 'connectionOther', draft.connectionOther, L.otherMax, other);
      break;
    case 'education':
      if (!draft.schoolPassYear.trim()) errors.schoolPassYear = 'Enter the year.';
      else if (parsePassYear(draft.schoolPassYear) === null)
        errors.schoolPassYear = `${yearRangeMessage()}.`;
      text(errors, 'schoolName', draft.schoolName, L.schoolNameMax, null);
      if (!draft.collegePassYear.trim()) errors.collegePassYear = 'Enter the year, or NA.';
      else if (parseCollegePassYear(draft.collegePassYear) === null)
        errors.collegePassYear = `${yearRangeMessage()}, or NA.`;
      text(errors, 'collegeName', draft.collegeName, L.collegeNameMax, null);
      text(
        errors,
        'highestDegree',
        draft.highestDegree,
        L.degreeMax,
        'Enter your highest degree, or NA.',
      );
      text(
        errors,
        'profession',
        draft.profession,
        L.professionMax,
        'Enter your profession or industry.',
      );
      text(
        errors,
        'occupation',
        draft.occupation,
        L.occupationMax,
        'Enter your occupation or job title.',
      );
      if (draft.linkedinUrl.trim() && normalizeLinkedInUrl(draft.linkedinUrl) === null)
        errors.linkedinUrl = 'Enter a LinkedIn profile link, like linkedin.com/in/your-name.';
      break;
    case 'journey':
      if (!draft.journeyStage) errors.journeyStage = 'Choose where you are in your journey.';
      else if (draft.journeyStage === OTHER_OPTION)
        text(errors, 'journeyStageOther', draft.journeyStageOther, L.otherMax, other);
      if (draft.joinReasons.length === 0) errors.joinReasons = 'Choose at least one reason.';
      if (draft.joinReasons.includes(OTHER_OPTION))
        text(errors, 'joinReasonOther', draft.joinReasonOther, L.otherMax, other);
      break;
    case 'role':
      if (!draft.appliedRole) errors.appliedRole = 'Choose how you would like to join.';
      else if (draft.appliedRole === 'ambassador') {
        const { ambassadorCategoriesMin: min, ambassadorCategoriesMax: max } = L;
        if (draft.categoryIds.length < min || draft.categoryIds.length > max)
          errors.categoryIds = `Choose ${inWords(min)} to ${inWords(max)} categories.`;
        if (!draft.weeklyHours) errors.weeklyHours = 'Choose how many hours a week you can offer.';
      }
      break;
  }
  return errors;
}

/** The API's field names, where they differ from the form's. */
export function toDraftField(apiField: string): DraftField | null {
  if (apiField === 'phoneNumber') return 'phoneNational';
  return apiField in EMPTY_DRAFT ? (apiField as DraftField) : null;
}

const optional = (value: string) => collapse(value) || null;

/** The answers as the API takes them. Call only once every step validates. */
export function toApplicationInput(draft: ApplicationDraft): ApplicationInput {
  const ambassador = draft.appliedRole === 'ambassador';
  const otherChosen = (chosen: boolean, value: string) => (chosen ? optional(value) : null);
  const college = parseCollegePassYear(draft.collegePassYear);
  const degree = collapse(draft.highestDegree);
  return {
    name: collapse(draft.name),
    maidenName: optional(draft.maidenName),
    phoneNumber: toE164(draft.phoneNational, draft.phoneCountry) ?? draft.phoneNational,
    city: collapse(draft.city),
    state: collapse(draft.state),
    country: draft.country,
    jodhpurConnections: draft.jodhpurConnections,
    connectionOther: otherChosen(
      draft.jodhpurConnections.includes(OTHER_OPTION),
      draft.connectionOther,
    ),
    schoolPassYear: parsePassYear(draft.schoolPassYear) ?? 0,
    schoolName: optional(draft.schoolName),
    collegePassYear:
      college === null || college === NOT_APPLICABLE ? NOT_APPLICABLE : Number(college),
    collegeName: optional(draft.collegeName),
    highestDegree: isNotApplicable(degree) ? NOT_APPLICABLE : degree,
    profession: collapse(draft.profession),
    occupation: collapse(draft.occupation),
    linkedinUrl: draft.linkedinUrl.trim() ? normalizeLinkedInUrl(draft.linkedinUrl) : null,
    journeyStage: draft.journeyStage,
    journeyStageOther: otherChosen(draft.journeyStage === OTHER_OPTION, draft.journeyStageOther),
    joinReasons: draft.joinReasons,
    joinReasonOther: otherChosen(draft.joinReasons.includes(OTHER_OPTION), draft.joinReasonOther),
    appliedRole: ambassador ? 'ambassador' : 'member',
    categoryIds: ambassador ? draft.categoryIds : [],
    weeklyHours: ambassador ? draft.weeklyHours : null,
  };
}
