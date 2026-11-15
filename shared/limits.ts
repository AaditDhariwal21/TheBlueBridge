/**
 * Input limits shared by the API (server/) and the client (client/). This is the one place
 * each limit is defined: the server validates with them, the client mirrors them for quick
 * feedback and in its helper text. Database check constraints are looser backstops.
 */

/** Supabase hashes with bcrypt, which reads only the first 72 bytes. */
export const PASSWORD_LIMITS = { min: 6, maxBytes: 72 } as const;

export const EMAIL_MAX = 254;

/** Discussion blogs, Query Blogs and comments. */
export const BLOG_LIMITS = {
  titleMin: 8,
  titleMax: 140,
  bodyMin: 20,
  bodyMax: 12_000,
  maxCategories: 5,
  queryTitleMin: 3,
  queryTitleMax: 80,
  queryDescriptionMin: 10,
  queryDescriptionMax: 500,
  commentMax: 2_000,
} as const;

/** The membership application (sign-up and reapply). */
export const PROFILE_LIMITS = {
  nameMax: 100,
  maidenNameMax: 100,
  occupationMax: 100,
  professionMax: 100,
  cityMax: 100,
  stateMax: 100,
  schoolNameMax: 150,
  collegeNameMax: 150,
  degreeMax: 100,
  /** The free text that goes with an "Other" answer. */
  otherMax: 200,
  linkedinUrlMax: 300,
  /** Choices in a multi-select question (Jodhpur connection, reasons for joining). */
  maxChoices: 10,
  /** An ambassador's categories. */
  ambassadorCategoriesMin: 1,
  ambassadorCategoriesMax: 3,
} as const;

/** The note an admin writes when approving or rejecting an application. */
export const REVIEW_NOTE_MAX = 500;

/** How "not applicable" is written and stored (college pass-out year, degree). */
export const NOT_APPLICABLE = 'NA';

/** The answer code that asks for free text ("Other") in every option-set question. */
export const OTHER_OPTION = 'other';

/** Pass-out years: from 1940 to a few years ahead (current students). */
export function passYearRange(now: Date = new Date()): { min: number; max: number } {
  return { min: 1940, max: now.getFullYear() + 8 };
}
