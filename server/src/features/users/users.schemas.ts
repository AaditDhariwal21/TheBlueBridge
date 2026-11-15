import { z } from 'zod';

import { isCountryCode } from '../../../../shared/countries.ts';
import { OTHER_OPTION, PROFILE_LIMITS, passYearRange } from '../../../../shared/limits.ts';
import { toE164 } from '../../../../shared/phone.ts';
import {
  isNotApplicable,
  normalizeLinkedInUrl,
  parseCollegePassYear,
  parsePassYear,
} from '../../../../shared/profile.ts';
import { optionalSingleLineText, singleLineText } from '../../lib/validation.ts';

/**
 * The membership application, sent at sign-up (POST /auth/signup, with the account fields)
 * and when a rejected applicant reapplies (POST /me/reapply). This is the single gate for
 * the mandatory answers: the database keeps the new columns nullable for users who joined
 * before they existed. Option-set answers are option codes; the service checks them
 * against the lookup tables.
 */

const L = PROFILE_LIMITS;
/** Small counts as words, for messages ("one to three"). */
const COUNT_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five'] as const;
const inWords = (n: number) => COUNT_WORDS[n] ?? String(n);

const optionCode = (required: string) =>
  z.string({ error: required }).regex(/^[a-z0-9_]{1,40}$/, { error: 'Choose from the list.' });

const optionCodes = (required: string) =>
  z
    .array(optionCode(required), { error: required })
    .min(1, { error: required })
    .max(L.maxChoices, { error: 'Choose fewer options.' })
    .refine((codes) => new Set(codes).size === codes.length, { error: 'Choose each option once.' });

/**
 * E.164 after libphonenumber-js validation. Send it with its country code (+91…). The issue
 * is not fatal, so the cross-field rules still report their problems in the same answer.
 */
const phoneNumber = z
  .string({ error: 'Enter your mobile number.' })
  .transform((value) => toE164(value) ?? value.trim())
  .superRefine((value, ctx) => {
    if (toE164(value) === value) return;
    ctx.addIssue({
      code: 'custom',
      message: value
        ? 'Enter a valid mobile number with its country code.'
        : 'Enter your mobile number.',
    });
  });

const yearMessage = () => {
  const { min, max } = passYearRange();
  return `Enter a year between ${min} and ${max}.`;
};

const schoolPassYear = z.unknown().transform((value, ctx) => {
  const year = parsePassYear(value);
  if (year === null) {
    ctx.addIssue({
      code: 'custom',
      message:
        value === undefined || value === null || value === '' ? 'Enter the year.' : yearMessage(),
    });
    return z.NEVER;
  }
  return year;
});

/** A year, or "NA" (e.g. no college): never null, which means "not answered yet". */
const collegePassYear = z.unknown().transform((value, ctx) => {
  const parsed = parseCollegePassYear(value);
  if (parsed === null) {
    ctx.addIssue({
      code: 'custom',
      message:
        value === undefined || value === null || value === ''
          ? 'Enter the year, or NA.'
          : `${yearMessage().slice(0, -1)}, or NA.`,
    });
    return z.NEVER;
  }
  return parsed;
});

const linkedinUrl = optionalSingleLineText(L.linkedinUrlMax).transform((value, ctx) => {
  if (value === null) return null;
  const url = normalizeLinkedInUrl(value);
  if (url === null) {
    ctx.addIssue({
      code: 'custom',
      message: 'Enter a LinkedIn profile link, like linkedin.com/in/your-name.',
    });
    return z.NEVER;
  }
  return url;
});

/** Free text with NA allowed; any spelling of NA is stored as "NA". */
const highestDegree = singleLineText(1, L.degreeMax, 'Enter your highest degree, or NA.').transform(
  (value) => (isNotApplicable(value) ? 'NA' : value),
);

const country = z
  .string({ error: 'Choose your country.' })
  .transform((value) => value.trim().toUpperCase())
  .refine(isCountryCode, { error: 'Choose your country from the list.' });

/** Every application answer. Spread into the sign-up body too. */
export const applicationFields = {
  name: singleLineText(1, L.nameMax, 'Enter your full name.'),
  maidenName: optionalSingleLineText(L.maidenNameMax),
  phoneNumber,
  city: singleLineText(1, L.cityMax, 'Enter your city.'),
  state: singleLineText(1, L.stateMax, 'Enter your state.'),
  country,

  jodhpurConnections: optionCodes('Choose at least one connection to Jodhpur.'),
  connectionOther: optionalSingleLineText(L.otherMax),

  schoolPassYear,
  schoolName: optionalSingleLineText(L.schoolNameMax),
  collegePassYear,
  collegeName: optionalSingleLineText(L.collegeNameMax),
  highestDegree,
  profession: singleLineText(1, L.professionMax, 'Enter your profession or industry.'),
  occupation: singleLineText(1, L.occupationMax, 'Enter your occupation or job title.'),
  linkedinUrl,

  journeyStage: optionCode('Choose where you are in your journey.'),
  journeyStageOther: optionalSingleLineText(L.otherMax),
  joinReasons: optionCodes('Choose at least one reason.'),
  joinReasonOther: optionalSingleLineText(L.otherMax),

  appliedRole: z.enum(['member', 'ambassador'], { error: 'Choose member or ambassador.' }),
  categoryIds: z
    .array(z.uuid({ error: 'Choose categories from the list.' }))
    .max(L.ambassadorCategoriesMax, {
      error: `Choose up to ${L.ambassadorCategoriesMax} categories.`,
    })
    .default([]),
  weeklyHours: optionCode('Choose how many hours a week you can offer.').nullable().default(null),
};

type ApplicationShape = z.output<z.ZodObject<typeof applicationFields>>;

/**
 * Rules across fields: "Other" needs its text, and only ambassadors choose categories and
 * hours (both required for them).
 */
export function checkApplication(input: ApplicationShape, ctx: z.RefinementCtx): void {
  const issue = (path: keyof ApplicationShape, message: string) => {
    ctx.addIssue({ code: 'custom', path: [path], message });
  };
  const other = 'Tell us a little more.';
  if (input.jodhpurConnections.includes(OTHER_OPTION) && input.connectionOther === null) {
    issue('connectionOther', other);
  }
  if (input.journeyStage === OTHER_OPTION && input.journeyStageOther === null) {
    issue('journeyStageOther', other);
  }
  if (input.joinReasons.includes(OTHER_OPTION) && input.joinReasonOther === null) {
    issue('joinReasonOther', other);
  }

  const { ambassadorCategoriesMin: min, ambassadorCategoriesMax: max } = L;
  if (input.appliedRole === 'ambassador') {
    if (input.categoryIds.length < min) {
      issue('categoryIds', `Choose ${inWords(min)} to ${inWords(max)} categories.`);
    }
    if (input.weeklyHours === null) {
      issue('weeklyHours', 'Choose how many hours a week you can offer.');
    }
  } else {
    if (input.categoryIds.length > 0) issue('categoryIds', 'Only ambassadors choose categories.');
    if (input.weeklyHours !== null) issue('weeklyHours', 'Only ambassadors offer hours.');
  }
  if (new Set(input.categoryIds).size !== input.categoryIds.length) {
    issue('categoryIds', 'Choose each category once.');
  }
}

/** "Other" text is kept only while "Other" is chosen. */
export function clearUnusedOther<T extends ApplicationShape>(input: T): T {
  return {
    ...input,
    connectionOther: input.jodhpurConnections.includes(OTHER_OPTION) ? input.connectionOther : null,
    journeyStageOther: input.journeyStage === OTHER_OPTION ? input.journeyStageOther : null,
    joinReasonOther: input.joinReasons.includes(OTHER_OPTION) ? input.joinReasonOther : null,
  };
}

/** POST /me/reapply */
export const applicationBody = z
  .strictObject(applicationFields)
  .superRefine(checkApplication)
  .transform(clearUnusedOther);

export type ApplicationInput = z.output<typeof applicationBody>;
