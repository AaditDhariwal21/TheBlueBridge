import type { ExpressionBuilder } from 'kysely';
import { jsonArrayFrom } from 'kysely/helpers/postgres';

import type { Database, Db, UserRole } from '../../db/schema.ts';

/** Just what authorization needs; loaded on every authenticated request. */
export function findPrincipal(db: Db, userId: string) {
  return db
    .selectFrom('users')
    .select(['user_id as id', 'role', 'status'])
    .where('user_id', '=', userId)
    .executeTakeFirst();
}

export function findProfile(db: Db, userId: string) {
  return db
    .selectFrom('users')
    .leftJoin('referral_codes', 'referral_codes.user_id', 'users.user_id')
    .select((eb) => [
      'users.user_id',
      'users.name',
      'users.phone_number',
      'users.occupation',
      'users.role',
      'users.status',
      'users.avatar_url',
      'users.review_note',
      'users.created_at',
      'referral_codes.code as referral_code',
      categoriesOf(eb),
    ])
    .where('users.user_id', '=', userId)
    .executeTakeFirst();
}

/**
 * The application answers of one user, with each option's code and label (option sets in
 * display order). Junction rows are found by their primary keys (user_id, …).
 */
export function findApplicationDetails(db: Db, userId: string) {
  return db
    .selectFrom('users as u')
    .leftJoin('journey_stages as js', 'js.journey_stage_id', 'u.journey_stage_id')
    .leftJoin('weekly_hours_options as wh', 'wh.weekly_hours_id', 'u.weekly_hours_id')
    .select((eb) => [
      'u.maiden_name',
      'u.city',
      'u.state',
      'u.country_code',
      'u.school_pass_year',
      'u.school_name',
      'u.college_pass_year',
      'u.college_name',
      'u.highest_degree',
      'u.profession',
      'u.linkedin_url',
      'u.connection_other',
      'u.journey_stage_other',
      'u.join_reason_other',
      'js.code as journey_stage_code',
      'js.label as journey_stage_label',
      'wh.code as weekly_hours_code',
      'wh.label as weekly_hours_label',
      jsonArrayFrom(
        eb
          .selectFrom('user_jodhpur_connections as ujc')
          .innerJoin('jodhpur_connections as o', 'o.connection_id', 'ujc.connection_id')
          .select(['o.code', 'o.label'])
          .whereRef('ujc.user_id', '=', 'u.user_id')
          .orderBy('o.sort_order'),
      ).as('connections'),
      jsonArrayFrom(
        eb
          .selectFrom('user_join_reasons as ujr')
          .innerJoin('join_reasons as o', 'o.join_reason_id', 'ujr.join_reason_id')
          .select(['o.code', 'o.label'])
          .whereRef('ujr.user_id', '=', 'u.user_id')
          .orderBy('o.sort_order'),
      ).as('reasons'),
    ])
    .where('u.user_id', '=', userId)
    .executeTakeFirst();
}

/** The application columns of users, as written at sign-up and on reapplying. */
export interface ApplicationColumns {
  name: string;
  maidenName: string | null;
  phoneNumber: string;
  city: string;
  state: string;
  country: string;
  schoolPassYear: number;
  schoolName: string | null;
  collegePassYear: string;
  collegeName: string | null;
  highestDegree: string;
  profession: string;
  occupation: string;
  linkedinUrl: string | null;
  journeyStageId: number;
  journeyStageOther: string | null;
  connectionOther: string | null;
  joinReasonOther: string | null;
  weeklyHoursId: number | null;
}

function applicationRow(values: ApplicationColumns) {
  return {
    name: values.name,
    maiden_name: values.maidenName,
    phone_number: values.phoneNumber,
    city: values.city,
    state: values.state,
    country_code: values.country,
    school_pass_year: values.schoolPassYear,
    school_name: values.schoolName,
    college_pass_year: values.collegePassYear,
    college_name: values.collegeName,
    highest_degree: values.highestDegree,
    profession: values.profession,
    occupation: values.occupation,
    linkedin_url: values.linkedinUrl,
    journey_stage_id: values.journeyStageId,
    journey_stage_other: values.journeyStageOther,
    connection_other: values.connectionOther,
    join_reason_other: values.joinReasonOther,
    weekly_hours_id: values.weeklyHoursId,
  };
}

export async function insertProfile(
  db: Db,
  values: ApplicationColumns & { userId: string; role: UserRole; referralCodeId: string },
): Promise<void> {
  await db
    .insertInto('users')
    .values({
      ...applicationRow(values),
      user_id: values.userId,
      role: values.role,
      status: 'pending',
      referral_code_id: values.referralCodeId,
    })
    .execute();
}

/** The applicant's row, locked until the transaction ends (reapplying). */
export function lockApplicant(trx: Db, userId: string) {
  return trx
    .selectFrom('users')
    .select(['user_id', 'role', 'status'])
    .where('user_id', '=', userId)
    .forNoKeyUpdate()
    .executeTakeFirst();
}

/**
 * A new application from the same account: new answers and role, back in the queue as
 * pending, with the previous review (and its note) cleared. The admin log keeps the history.
 */
export async function updateApplication(
  trx: Db,
  userId: string,
  values: ApplicationColumns & { role: UserRole },
): Promise<void> {
  await trx
    .updateTable('users')
    .set({
      ...applicationRow(values),
      role: values.role,
      status: 'pending',
      review_note: null,
      reviewed_by: null,
      reviewed_at: null,
    })
    .where('user_id', '=', userId)
    .execute();
}

export async function insertCategories(
  db: Db,
  userId: string,
  catIds: readonly string[],
): Promise<void> {
  if (catIds.length === 0) return;
  await db
    .insertInto('user_categories')
    .values(catIds.map((cat_id) => ({ user_id: userId, cat_id })))
    .execute();
}

export async function deleteCategories(trx: Db, userId: string): Promise<void> {
  await trx.deleteFrom('user_categories').where('user_id', '=', userId).execute();
}

/** Replaces the multi-select answers (Jodhpur connections, reasons for joining). */
export async function replaceAnswers(
  trx: Db,
  userId: string,
  answers: { connectionIds: readonly number[]; joinReasonIds: readonly number[] },
): Promise<void> {
  await trx.deleteFrom('user_jodhpur_connections').where('user_id', '=', userId).execute();
  await trx.deleteFrom('user_join_reasons').where('user_id', '=', userId).execute();
  if (answers.connectionIds.length > 0) {
    await trx
      .insertInto('user_jodhpur_connections')
      .values(answers.connectionIds.map((connection_id) => ({ user_id: userId, connection_id })))
      .execute();
  }
  if (answers.joinReasonIds.length > 0) {
    await trx
      .insertInto('user_join_reasons')
      .values(answers.joinReasonIds.map((join_reason_id) => ({ user_id: userId, join_reason_id })))
      .execute();
  }
}

/** An ambassador's categories as [{ id, name, color }], alphabetical. Empty for everyone else. */
function categoriesOf(eb: ExpressionBuilder<Database, 'users'>) {
  return jsonArrayFrom(
    eb
      .selectFrom('user_categories')
      .innerJoin('categories', 'categories.cat_id', 'user_categories.cat_id')
      .select(['categories.cat_id as id', 'categories.cat_name as name', 'categories.color'])
      .whereRef('user_categories.user_id', '=', 'users.user_id')
      .orderBy('categories.cat_name'),
  ).as('categories');
}

export async function selectCategoryIds(db: Db, userId: string): Promise<string[]> {
  const rows = await db
    .selectFrom('user_categories')
    .select('cat_id')
    .where('user_id', '=', userId)
    .execute();
  return rows.map((row) => row.cat_id);
}
